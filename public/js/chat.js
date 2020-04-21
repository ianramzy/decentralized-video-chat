// Vars
var isMuted;
var videoIsPaused;
var dataChanel = null;
const browserName = getBrowserName();
const url = window.location.href;
const roomHash = url.substring(url.lastIndexOf("/") + 1).toLowerCase();
var mode = "camera";
// var isFullscreen = false;
var sendingCaptions = false;
var receivingCaptions = false;
const isWebRTCSupported =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia ||
  window.RTCPeerConnection;

// Element vars
const chatInput = document.querySelector(".compose input");
const remoteVideoVanilla = document.getElementById("remote-video");
const remoteVideo = $("#remote-video");
const captionText = $("#remote-video-text");
const localVideoText = $("#local-video-text");
const captionButtontext = $("#caption-button-text");
const entireChat = $("#entire-chat");
const chatZone = $("#chat-zone");

var VideoChat = {
  connected: false,
  willInitiateCall: false,
  localICECandidates: [],
  socket: io(),
  remoteVideo: document.getElementById("remote-video"),
  localVideo: document.getElementById("local-video"),
  recognition: undefined,

  // Call to getUserMedia (provided by adapter.js for cross browser compatibility)
  // asking for access to both the video and audio streams. If the request is
  // accepted callback to the onMediaStream function, otherwise callback to the
  // noMediaStream function.
  requestMediaStream: function (event) {
    logIt("requestMediaStream");
    rePositionLocalVideo();
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        VideoChat.onMediaStream(stream);
        localVideoText.text("Drag Me");
        setTimeout(() => localVideoText.fadeOut(), 5000);
      })
      .catch((error) => {
        logIt(error);
        logIt(
          "Failed to get local webcam video, check webcam privacy settings"
        );
        // Keep trying to get user media
        setTimeout(VideoChat.requestMediaStream, 1000);
      });
  },

  // Called when a video stream is added to VideoChat
  onMediaStream: function (stream) {
    logIt("onMediaStream");
    VideoChat.localStream = stream;
    // Add the stream as video's srcObject.
    // Now that we have webcam video sorted, prompt user to share URL
    Snackbar.show({
      text: "Here is the join link for your call: " + url,
      actionText: "Copy Link",
      width: "750px",
      pos: "top-center",
      actionTextColor: "#616161",
      duration: 500000,
      backgroundColor: "#16171a",
      onActionClick: function (element) {
        // Copy url to clipboard, this is achieved by creating a temporary element,
        // adding the text we want to that element, selecting it, then deleting it
        var copyContent = window.location.href;
        $('<input id="some-element">')
          .val(copyContent)
          .appendTo("body")
          .select();
        document.execCommand("copy");
        var toRemove = document.querySelector("#some-element");
        toRemove.parentNode.removeChild(toRemove);
        Snackbar.close();
      },
    });
    VideoChat.localVideo.srcObject = stream;
    // Now we're ready to join the chat room.
    VideoChat.socket.emit("join", roomHash);
    // Add listeners to the websocket
    VideoChat.socket.on("full", chatRoomFull);
    VideoChat.socket.on("offer", VideoChat.onOffer);
    VideoChat.socket.on("ready", VideoChat.readyToCall);
    VideoChat.socket.on(
      "willInitiateCall",
      () => (VideoChat.willInitiateCall = true)
    );
  },

  // When we are ready to call, enable the Call button.
  readyToCall: function (event) {
    logIt("readyToCall");
    // First to join call will most likely initiate call
    if (VideoChat.willInitiateCall) {
      logIt("Initiating call");
      VideoChat.startCall();
    }
  },

  // Set up a callback to run when we have the ephemeral token to use Twilio's TURN server.
  startCall: function (event) {
    logIt("startCall >>> Sending token request...");
    VideoChat.socket.on("token", VideoChat.onToken(VideoChat.createOffer));
    VideoChat.socket.emit("token", roomHash);
  },

  // When we receive the ephemeral token back from the server.
  onToken: function (callback) {
    logIt("onToken");
    return function (token) {
      logIt("<<< Received token");
      // Set up a new RTCPeerConnection using the token's iceServers.
      VideoChat.peerConnection = new RTCPeerConnection({
        iceServers: token.iceServers,
      });
      // Add the local video stream to the peerConnection.
      VideoChat.localStream.getTracks().forEach(function (track) {
        VideoChat.peerConnection.addTrack(track, VideoChat.localStream);
      });
      // Add general purpose data channel to peer connection,
      // used for text chats, captions, and toggling sending captions
      dataChanel = VideoChat.peerConnection.createDataChannel("chat", {
        negotiated: true,
        // both peers must have same id
        id: 0,
      });
      // Called when dataChannel is successfully opened
      dataChanel.onopen = function (event) {
        logIt("dataChannel opened");
      };
      // Handle different dataChannel types
      dataChanel.onmessage = function (event) {
        const receivedData = event.data;
        // First 4 chars represent data type
        const dataType = receivedData.substring(0, 4);
        const cleanedMessage = receivedData.slice(4);
        if (dataType === "mes:") {
          handleRecieveMessage(cleanedMessage);
        } else if (dataType === "cap:") {
          recieveCaptions(cleanedMessage);
        } else if (dataType === "tog:") {
          toggleSendCaptions();
        }
      };
      // Set up callbacks for the connection generating iceCandidates or
      // receiving the remote media stream.
      VideoChat.peerConnection.onicecandidate = VideoChat.onIceCandidate;
      VideoChat.peerConnection.onaddstream = VideoChat.onAddStream;
      // Set up listeners on the socket
      VideoChat.socket.on("candidate", VideoChat.onCandidate);
      VideoChat.socket.on("answer", VideoChat.onAnswer);
      VideoChat.socket.on("requestToggleCaptions", () => toggleSendCaptions());
      VideoChat.socket.on("recieveCaptions", (captions) =>
        recieveCaptions(captions)
      );
      // Called when there is a change in connection state
      VideoChat.peerConnection.oniceconnectionstatechange = function (event) {
        switch (VideoChat.peerConnection.iceConnectionState) {
          case "connected":
            logIt("connected");
            // Once connected we no longer have a need for the signaling server, so disconnect
            VideoChat.socket.disconnect();
            break;
          case "disconnected":
            logIt("disconnected");
          case "failed":
            logIt("failed");
            // VideoChat.socket.connect
            // VideoChat.createOffer();
            // Refresh page if connection has failed
            location.reload();
            break;
          case "closed":
            logIt("closed");
            break;
        }
      };
      callback();
    };
  },

  // When the peerConnection generates an ice candidate, send it over the socket to the peer.
  onIceCandidate: function (event) {
    logIt("onIceCandidate");
    if (event.candidate) {
      logIt(
        `<<< Received local ICE candidate from STUN/TURN server (${event.candidate.address})`
      );
      if (VideoChat.connected) {
        logIt(`>>> Sending local ICE candidate (${event.candidate.address})`);
        VideoChat.socket.emit(
          "candidate",
          JSON.stringify(event.candidate),
          roomHash
        );
      } else {
        // If we are not 'connected' to the other peer, we are buffering the local ICE candidates.
        // This most likely is happening on the "caller" side.
        // The peer may not have created the RTCPeerConnection yet, so we are waiting for the 'answer'
        // to arrive. This will signal that the peer is ready to receive signaling.
        VideoChat.localICECandidates.push(event.candidate);
      }
    }
  },

  // When receiving a candidate over the socket, turn it back into a real
  // RTCIceCandidate and add it to the peerConnection.
  onCandidate: function (candidate) {
    // Update caption text
    captionText.text("Found other user... connecting");
    rtcCandidate = new RTCIceCandidate(JSON.parse(candidate));
    logIt(
      `onCandidate <<< Received remote ICE candidate (${rtcCandidate.address} - ${rtcCandidate.relatedAddress})`
    );
    VideoChat.peerConnection.addIceCandidate(rtcCandidate);
  },

  // Create an offer that contains the media capabilities of the browser.
  createOffer: function () {
    logIt("createOffer >>> Creating offer...");
    VideoChat.peerConnection.createOffer(
      function (offer) {
        // If the offer is created successfully, set it as the local description
        // and send it over the socket connection to initiate the peerConnection
        // on the other side.
        VideoChat.peerConnection.setLocalDescription(offer);
        VideoChat.socket.emit("offer", JSON.stringify(offer), roomHash);
      },
      function (err) {
        logIt("failed offer creation");
        logIt(err, true);
      }
    );
  },

  // Create an answer with the media capabilities that both browsers share.
  // This function is called with the offer from the originating browser, which
  // needs to be parsed into an RTCSessionDescription and added as the remote
  // description to the peerConnection object. Then the answer is created in the
  // same manner as the offer and sent over the socket.
  createAnswer: function (offer) {
    logIt("createAnswer");
    return function () {
      logIt(">>> Creating answer...");
      rtcOffer = new RTCSessionDescription(JSON.parse(offer));
      VideoChat.peerConnection.setRemoteDescription(rtcOffer);
      VideoChat.peerConnection.createAnswer(
        function (answer) {
          VideoChat.peerConnection.setLocalDescription(answer);
          VideoChat.socket.emit("answer", JSON.stringify(answer), roomHash);
        },
        function (err) {
          logIt("Failed answer creation.");
          logIt(err, true);
        }
      );
    };
  },

  // When a browser receives an offer, set up a callback to be run when the
  // ephemeral token is returned from Twilio.
  onOffer: function (offer) {
    logIt("onOffer <<< Received offer");
    VideoChat.socket.on(
      "token",
      VideoChat.onToken(VideoChat.createAnswer(offer))
    );
    VideoChat.socket.emit("token", roomHash);
  },

  // When an answer is received, add it to the peerConnection as the remote description.
  onAnswer: function (answer) {
    logIt("onAnswer <<< Received answer");
    var rtcAnswer = new RTCSessionDescription(JSON.parse(answer));
    // Set remote description of RTCSession
    VideoChat.peerConnection.setRemoteDescription(rtcAnswer);
    // The caller now knows that the callee is ready to accept new ICE candidates, so sending the buffer over
    VideoChat.localICECandidates.forEach((candidate) => {
      logIt(`>>> Sending local ICE candidate (${candidate.address})`);
      // Send ice candidate over websocket
      VideoChat.socket.emit("candidate", JSON.stringify(candidate), roomHash);
    });
    // Reset the buffer of local ICE candidates. This is not really needed, but it's good practice
    VideoChat.localICECandidates = [];
  },

  // Called when a stream is added to the peer connection
  onAddStream: function (event) {
    logIt("onAddStream <<< Received new stream from remote. Adding it...");
    // Update remote video source
    VideoChat.remoteVideo.srcObject = event.stream;
    // Close the initial share url snackbar
    Snackbar.close();
    // Remove the loading gif from video
    VideoChat.remoteVideo.style.background = "none";
    // Update connection status
    VideoChat.connected = true;
    // Hide caption status text
    captionText.fadeOut();
    // Reposition local video after a second, as there is often a delay
    // between adding a stream and the height of the video div changing
    setTimeout(() => rePositionLocalVideo(), 500);
    // var timesRun = 0;
    // var interval = setInterval(function () {
    //   timesRun += 1;
    //   if (timesRun === 10) {
    //     clearInterval(interval);
    //   }
    //   rePositionLocalVideo();
    // }, 300);
  },
};

// Get name of browser session using user agent
function getBrowserName() {
  var name = "Unknown";
  if (window.navigator.userAgent.indexOf("MSIE") !== -1) {
  } else if (window.navigator.userAgent.indexOf("Firefox") !== -1) {
    name = "Firefox";
  } else if (window.navigator.userAgent.indexOf("Opera") !== -1) {
    name = "Opera";
  } else if (window.navigator.userAgent.indexOf("Chrome") !== -1) {
    name = "Chrome";
  } else if (window.navigator.userAgent.indexOf("Safari") !== -1) {
    name = "Safari";
  }
  return name;
}

// Basic logging class wrapper
function logIt(message, error) {
  console.log(message);
}

// Called when socket receives message that room is full
function chatRoomFull() {
  alert(
    "Chat room is full. Check to make sure you don't have multiple open tabs, or try with a new room link"
  );
  // Exit room and redirect
  window.location.href = "/newcall";
}

// Reposition local video to top left of remote video
function rePositionLocalVideo() {
  // Get position of remote video
  var bounds = remoteVideo.position();
  let localVideo = $("#local-video");
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  ) {
    bounds.top = $(window).height() * 0.7;
    bounds.left += 10;
  } else {
    bounds.top += 10;
    bounds.left += 10;
  }
  // Set position of local video
  $("#moveable").css(bounds);
}

// Reposition captions to bottom of video
function rePositionCaptions() {
  // Get remote video position
  var bounds = remoteVideo.position();
  bounds.top -= 10;
  bounds.top = bounds.top + remoteVideo.height() - 1 * captionText.height();
  // Reposition captions
  captionText.css(bounds);
}

// Called when window is resized
function windowResized() {
  rePositionLocalVideo();
  rePositionCaptions();
}

// Fullscreen
// function openFullscreen() {
//   try {
//     // var elem = document.getElementById("remote-video");
//     var elem = document.getElementById("body");
//     if (!isFullscreen) {
//       VideoChat.remoteVideo.classList.add("fullscreen");
//       isFullscreen = true;
//       if (elem.requestFullscreen) {
//         elem.requestFullscreen();
//       } else if (elem.mozRequestFullScreen) {
//         /* Firefox */
//         elem.mozRequestFullScreen();
//       } else if (elem.webkitRequestFullscreen) {
//         /* Chrome, Safari and Opera */
//
//         elem.webkitRequestFullscreen();
//         setTimeout(windowResized, 1000);
//       } else if (elem.msRequestFullscreen) {
//         /* IE/Edge */
//         elem.msRequestFullscreen();
//       }
//     } else {
//       isFullscreen = false;
//       VideoChat.remoteVideo.classList.remove("fullscreen");
//       if (document.exitFullscreen) {
//         document.exitFullscreen();
//       } else if (document.mozCancelFullScreen) {
//         /* Firefox */
//         document.mozCancelFullScreen();
//       } else if (document.webkitExitFullscreen) {
//         /* Chrome, Safari and Opera */
//         document.webkitExitFullscreen();
//       } else if (document.msExitFullscreen) {
//         /* IE/Edge */
//         document.msExitFullscreen();
//       }
//     }
//   } catch (e) {
//     logIt(e);
//   }
//   setTimeout(windowResized, 1000);
// }
// End Fullscreen

// Mute microphone
function muteMicrophone() {
  var audioTrack = null;
  // Get audio track to mute
  VideoChat.peerConnection.getSenders().find(function (s) {
    if (s.track.kind === "audio") {
      audioTrack = s.track;
    }
  });
  isMuted = !audioTrack.enabled;
  audioTrack.enabled = isMuted;
  isMuted = !isMuted;
  // select mic button and mic button text
  const micButtonIcon = document.getElementById("mic-icon");
  const micButtonText = document.getElementById("mic-text");
  // Update mute button text and icon
  if (isMuted) {
    micButtonIcon.classList.remove("fa-microphone");
    micButtonIcon.classList.add("fa-microphone-slash");
    micButtonText.innerText = "Unmute";
  } else {
    micButtonIcon.classList.add("fa-microphone");
    micButtonIcon.classList.remove("fa-microphone-slash");
    micButtonText.innerText = "Mute";
  }
}
// End Mute microphone

// Pause Video
function pauseVideo() {
  var videoTrack = null;
  // Get video track to pause
  VideoChat.peerConnection.getSenders().find(function (s) {
    if (s.track.kind === "video") {
      videoTrack = s.track;
    }
  });
  videoIsPaused = !videoTrack.enabled;
  videoTrack.enabled = videoIsPaused;
  videoIsPaused = !videoIsPaused;
  // select video button and video button text
  const videoButtonIcon = document.getElementById("video-icon");
  const videoButtonText = document.getElementById("video-text");
  // update pause button icon and text
  if (videoIsPaused) {
    localVideoText.text("Video is paused");
    localVideoText.show();
    videoButtonIcon.classList.remove("fa-video");
    videoButtonIcon.classList.add("fa-video-slash");
    videoButtonText.innerText = "Unpause Video";
  } else {
    localVideoText.text("Video unpaused");
    setTimeout(() => localVideoText.fadeOut(), 2000);
    videoButtonIcon.classList.add("fa-video");
    videoButtonIcon.classList.remove("fa-video-slash");
    videoButtonText.innerText = "Pause Video";
  }
}
// End pause Video

// Swap camera / screen share
function swap() {
  // Handle swap video before video call is connected
  if (!VideoChat.connected) {
    alert("You must join a call before you can share your screen.");
    return;
  }
  // Store swap button icon and text
  const swapIcon = document.getElementById("swap-icon");
  const swapText = document.getElementById("swap-text");
  // If mode is camera then switch to screen share
  if (mode === "camera") {
    // Show accept screenshare snackbar
    Snackbar.show({
      text:
        "Please allow screen share. Click the middle of the picture above and then press share.",
      width: "400px",
      pos: "bottom-center",
      actionTextColor: "#616161",
      duration: 50000,
    });
    // Request screen share, note we dont want to capture audio
    // as we already have the stream from the Webcam
    navigator.mediaDevices
      .getDisplayMedia({
        video: true,
        audio: false,
      })
      .then(function (stream) {
        // Close allow screenshare snackbar
        Snackbar.close();
        // Change display mode
        mode = "screen";
        // Update swap button icon and text
        swapIcon.classList.remove("fa-desktop");
        swapIcon.classList.add("fa-camera");
        swapText.innerText = "Share Webcam";
        switchStreamHelper(stream);
      })
      .catch(function (err) {
        logIt(err);
        logIt("Error sharing screen");
        Snackbar.close();
      });
    // If mode is screenshare then switch to webcam
  } else {
    // Stop the screen share track
    VideoChat.localVideo.srcObject.getTracks().forEach((track) => track.stop());
    // Get webcam input
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then(function (stream) {
        // Change display mode
        mode = "camera";
        // Update swap button icon and text
        swapIcon.classList.remove("fa-camera");
        swapIcon.classList.add("fa-desktop");
        swapText.innerText = "Share Screen";
        switchStreamHelper(stream);
      });
  }
}

// Swap current video track with passed in stream
function switchStreamHelper(stream) {
  // Get current video track
  let videoTrack = stream.getVideoTracks()[0];
  // Add listen for if the current track swaps, swap back
  videoTrack.onended = function () {
    swap();
  };
  if (VideoChat.connected) {
    // Find sender
    const sender = VideoChat.peerConnection.getSenders().find(function (s) {
      // make sure tack types match
      return s.track.kind === videoTrack.kind;
    });
    // Replace sender track
    sender.replaceTrack(videoTrack);
  }
  // Update local video stream
  VideoChat.localStream = videoTrack;
  // Update local video object
  VideoChat.localVideo.srcObject = stream;
  // Unpause video on swap
  if (videoIsPaused) {
    pauseVideo();
  }
}
// End swap camera / screen share

// Live caption
// Request captions from other user, toggles state
function requestToggleCaptions() {
  // Handle requesting captions before connected
  if (!VideoChat.connected) {
    alert("You must be connected to a peer to use Live Caption");
    return;
  }
  if (receivingCaptions) {
    captionText.text("").fadeOut();
    captionButtontext.text("Start Live Caption");
    receivingCaptions = false;
  } else {
    Snackbar.show({
      text:
        "This is an experimental feature. Live caption requires the other user to be using Chrome",
      width: "400px",
      pos: "bottom-center",
      actionTextColor: "#616161",
      duration: 10000,
    });
    captionButtontext.text("End Live Caption");
    receivingCaptions = true;
  }
  // Send request to get captions over data channel
  dataChanel.send("tog:");
}

// Start/stop sending captions to other user
function toggleSendCaptions() {
  if (sendingCaptions) {
    sendingCaptions = false;
    VideoChat.recognition.stop();
  } else {
    startSpeech();
    sendingCaptions = true;
  }
}

// Start speech recognition
function startSpeech() {
  try {
    var SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    VideoChat.recognition = new SpeechRecognition();
    // VideoChat.recognition.lang = "en";
  } catch (e) {
    sendingCaptions = false;
    logIt(e);
    logIt("error importing speech library");
    // Alert other user that they cannon use live caption
    dataChanel.send("cap:notusingchrome");
    return;
  }
  // recognition.maxAlternatives = 3;
  VideoChat.recognition.continuous = true;
  // Show results that aren't final
  VideoChat.recognition.interimResults = true;
  var finalTranscript;
  VideoChat.recognition.onresult = (event) => {
    let interimTranscript = "";
    for (let i = event.resultIndex, len = event.results.length; i < len; i++) {
      var transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
        var charsToKeep = interimTranscript.length % 100;
        // Send captions over data chanel,
        // subtracting as many complete 100 char slices from start
        dataChanel.send(
          "cap:" +
            interimTranscript.substring(interimTranscript.length - charsToKeep)
        );
      }
    }
  };
  VideoChat.recognition.onend = function () {
    logIt("on speech recording end");
    // Restart speech recognition if user has not stopped it
    if (sendingCaptions) {
      startSpeech();
    } else {
      VideoChat.recognition.stop();
    }
  };
  VideoChat.recognition.start();
}

// Recieve captions over datachannel
function recieveCaptions(captions) {
  if (receivingCaptions) {
    captionText.text("").fadeIn();
  } else {
    captionText.text("").fadeOut();
  }
  // Other user is not using chrome
  if (captions === "notusingchrome") {
    alert(
      "Other caller must be using chrome for this feature to work. Live Caption turned off."
    );
    receivingCaptions = false;
    captionText.text("").fadeOut();
    captionButtontext.text("Start Live Caption");
    return;
  }
  captionText.text(captions);
  rePositionCaptions();
}
// End Live caption

// Translation
// function translate(text) {
//   let fromLang = "en";
//   let toLang = "zh";
//   // let text = "hello how are you?";
//   const API_KEY = "APIKEYHERE";
//   let gurl = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
//   gurl += "&q=" + encodeURI(text);
//   gurl += `&source=${fromLang}`;
//   gurl += `&target=${toLang}`;
//   fetch(gurl, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//       Accept: "application/json",
//     },
//   })
//     .then((res) => res.json())
//     .then((response) => {
//       // console.log("response from google: ", response);
//       // return response["data"]["translations"][0]["translatedText"];
//       logIt(response);
//       var translatedText =
//         response["data"]["translations"][0]["translatedText"];
//       console.log(translatedText);
//       dataChanel.send("cap:" + translatedText);
//     })
//     .catch((error) => {
//       console.log("There was an error with the translation request: ", error);
//     });
// }
// End Translation

// Text Chat
// Add text message to chat screen on page
function addMessageToScreen(msg, isOwnMessage) {
  if (isOwnMessage) {
    $(".chat-messages").append(
      '<div class="message-item customer cssanimation fadeInBottom"><div class="message-bloc"><div class="message">' +
        msg +
        "</div></div></div>"
    );
  } else {
    $(".chat-messages").append(
      '<div class="message-item moderator cssanimation fadeInBottom"><div class="message-bloc"><div class="message">' +
        msg +
        "</div></div></div>"
    );
  }
}

// Listen for enter press on chat input
chatInput.addEventListener("keypress", function (event) {
  if (event.keyCode === 13) {
    // Prevent page refresh on enter
    event.preventDefault();
    var msg = chatInput.value;
    // Prevent cross site scripting
    msg = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Make links clickable
    msg = msg.autoLink();
    // Send message over data channel
    dataChanel.send("mes:" + msg);
    // Add message to screen
    addMessageToScreen(msg, true);
    // Auto scroll chat down
    chatZone.scrollTop(chatZone[0].scrollHeight);
    // Clear chat input
    chatInput.value = "";
  }
});

// Called when a message is recieved over the dataChannel
function handleRecieveMessage(msg) {
  // Add message to screen
  addMessageToScreen(msg, false);
  // Auto scroll chat down
  chatZone.scrollTop(chatZone[0].scrollHeight);
  // Show chat if hidden
  if (entireChat.is(":hidden")) {
    toggleChat();
  }
}

// Show and hide chat
function toggleChat() {
  var chatIcon = document.getElementById("chat-icon");
  var chatText = $("#chat-text");
  if (entireChat.is(":visible")) {
    entireChat.fadeOut();
    // Update show chat buttton
    chatText.text("Show Chat");
    chatIcon.classList.remove("fa-comment-slash");
    chatIcon.classList.add("fa-comment");
  } else {
    entireChat.fadeIn();
    // Update show chat buttton
    chatText.text("Hide Chat");
    chatIcon.classList.remove("fa-comment");
    chatIcon.classList.add("fa-comment-slash");
  }
}
// End Text chat

//Picture in picture
function togglePictureInPicture() {
  if (
    "pictureInPictureEnabled" in document ||
    remoteVideoVanilla.webkitSetPresentationMode
  ) {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch((error) => {
        logIt("Error exiting pip.");
        logIt(error);
      });
    } else if (remoteVideoVanilla.webkitPresentationMode === "inline") {
      remoteVideoVanilla.webkitSetPresentationMode("picture-in-picture");
    } else if (
      remoteVideoVanilla.webkitPresentationMode === "picture-in-picture"
    ) {
      remoteVideoVanilla.webkitSetPresentationMode("inline");
    } else {
      remoteVideoVanilla.requestPictureInPicture().catch((error) => {
        alert(
          "You must be connected to another person to enter picture in picture."
        );
      });
    }
  } else {
    alert(
      "Picture in picture is not supported in your browser. Consider using Chrome or Safari."
    );
  }
}
//Picture in picture

function startUp() {
  //  Try and detect in-app browsers and redirect
  var ua = navigator.userAgent || navigator.vendor || window.opera;
  if (
    DetectRTC.isMobileDevice &&
    (ua.indexOf("FBAN") > -1 ||
      ua.indexOf("FBAV") > -1 ||
      ua.indexOf("Instagram") > -1)
  ) {
    if (DetectRTC.osName === "iOS") {
      window.location.href = "/notsupportedios";
    } else {
      window.location.href = "/notsupported";
    }
  }

  // Redirect all iOS browsers that are not Safari
  if (DetectRTC.isMobileDevice) {
    if (DetectRTC.osName === "iOS" && !DetectRTC.browser.isSafari) {
      window.location.href = "/notsupportedios";
    }
  }

  if (!isWebRTCSupported || browserName === "MSIE") {
    window.location.href = "/notsupported";
  }

  // Set tab title
  document.title = "Zipcall - " + url.substring(url.lastIndexOf("/") + 1);

  // get webcam on load
  VideoChat.requestMediaStream();

  // Captions hidden by default
  captionText.text("").fadeOut();

  // Make local video draggable
  $("#moveable").draggable({ containment: "window" });

  // Hide button labels on load
  $(".HoverState").hide();

  // Text chat hidden by default
  entireChat.hide();

  // Show hide button labels on hover
  $(document).ready(function () {
    $(".hoverButton").mouseover(function () {
      $(".HoverState").hide();
      $(this).next().show();
    });
    $(".hoverButton").mouseout(function () {
      $(".HoverState").hide();
    });
  });

  // Fade out / show UI on mouse move
  var timedelay = 1;
  function delayCheck() {
    if (timedelay === 5) {
      // $(".multi-button").fadeOut();
      $("#header").fadeOut();
      timedelay = 1;
    }
    timedelay = timedelay + 1;
  }
  $(document).mousemove(function () {
    $(".multi-button").fadeIn();
    $("#header").fadeIn();
    $(".multi-button").style = "";
    timedelay = 1;
    clearInterval(_delay);
    _delay = setInterval(delayCheck, 500);
  });
  _delay = setInterval(delayCheck, 500);

  // Show accept webcam snackbar
  Snackbar.show({
    text: "Please allow microphone and webcam access",
    actionText: "Show Me How",
    width: "455px",
    pos: "top-right",
    actionTextColor: "#616161",
    duration: 50000,
    onActionClick: function (element) {
      window.open(
        "https://getacclaim.zendesk.com/hc/en-us/articles/360001547832-Setting-the-default-camera-on-your-browser",
        "_blank"
      );
    },
  });

  // Set caption text on start
  captionText.text("Waiting for other user to join...").fadeIn();

  // Reposition captions on start
  rePositionCaptions();

  // On change media devices refresh page and switch to system default
  navigator.mediaDevices.ondevicechange = () => window.location.reload();
}

startUp();
