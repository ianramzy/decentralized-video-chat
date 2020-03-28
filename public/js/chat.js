if (window.location.pathname === "/room") {
    window.location.href = "/landing/newroom";
}

url = window.location.href;
const roomHash = url.substring(url.lastIndexOf('/') + 1).toLowerCase();


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

var browserName = getBrowserName();

var isWebRTCSupported =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia ||
    window.RTCPeerConnection;

// Handle IE
if (!isWebRTCSupported || browserName === "Safari" || browserName === "MSIE") {
    alert("Your browser doesn't support Neon Chat. Please use Chrome or Firefox.");
    window.location.href = "/";
}


function logIt(message, error) {
    console.log(message);
}

// Create an object to save various objects to without polluting the global namespace.
var VideoChat = {
    connected: false,
    willInitiateCall: false,
    localICECandidates: [],
    // Initialise our connection to the WebSocket.
    socket: io(),
    remoteVideo: document.getElementById('remote-video'),
    localVideo: document.getElementById('local-video'),

    // Call to getUserMedia (provided by adapter.js for cross browser compatibility)
    // asking for access to both the video and audio streams. If the request is
    // accepted callback to the onMediaStream function, otherwise callback to the
    // noMediaStream function.
    requestMediaStream: function (event) {
        logIt("requestMediaStream");
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        }).then(stream => {
            VideoChat.onMediaStream(stream);
            $('#local-video-text').text("Drag Me");
            setTimeout(() => $('#local-video-text').hide(), 5000);
        }).catch(error => {
            logIt(error);
            logIt('Failed to get local webcam video, check webcam privacy settings');
            setTimeout(VideoChat.requestMediaStream, 1000);
        });
    },


    // The onMediaStream function receives the media stream as an argument.
    onMediaStream: function (stream) {
        logIt("onMediaStream");
        VideoChat.localStream = stream;
        // Add the stream as video's srcObject.
        Snackbar.show({
            text: 'Share this URL with a friend to get started',
            actionText: 'Copy Link',
            width: '355px',
            pos: 'top-left',
            actionTextColor: '#8688ff',
            duration: 500000,
            backgroundColor: '#16171a',
            onActionClick: function (element) {
                var copyContent = window.location.href;
                $('<input id="some-element">').val(copyContent).appendTo('body').select();
                document.execCommand('copy');
                var toRemove = document.querySelector('#some-element');
                toRemove.parentNode.removeChild(toRemove);
                $(element).css('opacity', 0); //Set opacity of element to 0 to close Snackbar
            }
        });
        VideoChat.localVideo.srcObject = stream;
        // Now we're ready to join the chat room.
        VideoChat.socket.emit('join', roomHash);
        VideoChat.socket.on('full', VideoChat.chatRoomFull);
        VideoChat.socket.on('offer', VideoChat.onOffer);
        VideoChat.socket.on('ready', VideoChat.readyToCall);
        VideoChat.socket.on('willInitiateCall', () => VideoChat.willInitiateCall = true);
    },


    chatRoomFull: function () {
        alert("Chat room is full. Check to make sure you don't have multiple open tabs, or try with a new room link");
        window.location.href = "/newroom";
    },

    // When we are ready to call, enable the Call button.
    readyToCall: function (event) {
        logIt("readyToCall");
        if (VideoChat.willInitiateCall) {
            logIt("Initiating call")
            VideoChat.startCall()
        }
    },

    // Set up a callback to run when we have the ephemeral token to use Twilio's TURN server.
    startCall: function (event) {
        logIt("startCall");
        logIt('>>> Sending token request...');
        VideoChat.socket.on('token', VideoChat.onToken(VideoChat.createOffer));
        VideoChat.socket.emit('token', roomHash);
    },

    // When we receive the ephemeral token back from the server.
    onToken: function (callback) {
        logIt("onToken");
        return function (token) {
            logIt('<<< Received token');
            // Set up a new RTCPeerConnection using the token's iceServers.
            VideoChat.peerConnection = new RTCPeerConnection({iceServers: token.iceServers});
            // Add the local video stream to the peerConnection.
            VideoChat.localStream.getTracks().forEach(function (track) {
                VideoChat.peerConnection.addTrack(track, VideoChat.localStream);
            });
            // Set up callbacks for the connection generating iceCandidates or
            // receiving the remote media stream.
            VideoChat.peerConnection.onicecandidate = VideoChat.onIceCandidate;
            VideoChat.peerConnection.onaddstream = VideoChat.onAddStream;
            // Set up listeners on the socket for candidates or answers being passed
            // over the socket connection.
            VideoChat.socket.on('candidate', VideoChat.onCandidate);
            VideoChat.socket.on('answer', VideoChat.onAnswer);
            callback();
        };
    },

    // When the peerConnection generates an ice candidate, send it over the socket to the peer.
    onIceCandidate: function (event) {
        logIt("onIceCandidate");
        if (event.candidate) {
            logIt(`<<< Received local ICE candidate from STUN/TURN server (${event.candidate.address})`);
            if (VideoChat.connected) {
                logIt(`>>> Sending local ICE candidate (${event.candidate.address})`);
                VideoChat.socket.emit('candidate', JSON.stringify(event.candidate), roomHash);
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
        logIt("onCandidate");
        rtcCandidate = new RTCIceCandidate(JSON.parse(candidate));
        logIt(`<<< Received remote ICE candidate (${rtcCandidate.address} - ${rtcCandidate.relatedAddress})`);
        VideoChat.peerConnection.addIceCandidate(rtcCandidate);
    },

    // Create an offer that contains the media capabilities of the browser.
    createOffer: function () {
        logIt("createOffer");
        logIt('>>> Creating offer...');
        VideoChat.peerConnection.createOffer(
            function (offer) {
                // If the offer is created successfully, set it as the local description
                // and send it over the socket connection to initiate the peerConnection
                // on the other side.
                VideoChat.peerConnection.setLocalDescription(offer);
                VideoChat.socket.emit('offer', JSON.stringify(offer), roomHash);
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
            logIt('>>> Creating answer...');
            // VideoChat.connected = true;
            rtcOffer = new RTCSessionDescription(JSON.parse(offer));
            VideoChat.peerConnection.setRemoteDescription(rtcOffer);
            VideoChat.peerConnection.createAnswer(
                function (answer) {
                    VideoChat.peerConnection.setLocalDescription(answer);
                    VideoChat.socket.emit('answer', JSON.stringify(answer), roomHash);
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
        logIt("onOffer");
        logIt('<<< Received offer');
        VideoChat.socket.on('token', VideoChat.onToken(VideoChat.createAnswer(offer)));
        VideoChat.socket.emit('token', roomHash);
    },

    // When an answer is received, add it to the peerConnection as the remote
    // description.
    onAnswer: function (answer) {
        logIt("onAnswer");
        logIt('<<< Received answer');

        var rtcAnswer = new RTCSessionDescription(JSON.parse(answer));
        VideoChat.peerConnection.setRemoteDescription(rtcAnswer);
        VideoChat.connected = true;
        // should prolly move conneted = true to onaddstream
        VideoChat.localICECandidates.forEach(candidate => {
            // The caller now knows that the callee is ready to accept new ICE candidates, so sending the buffer over
            logIt(`>>> Sending local ICE candidate (${candidate.address})`);
            VideoChat.socket.emit('candidate', JSON.stringify(candidate), roomHash);
        });
        // Reset the buffer of local ICE candidates. This is not really needed
        // in this specific client, but it's good practice
        VideoChat.localICECandidates = [];
    },

    // When the peerConnection receives the actual media stream from the other
    // browser, add it to the other video element on the page.
    onAddStream: function (event) {
        logIt("onAddStream");
        logIt('<<< Received new stream from remote. Adding it...');
        VideoChat.remoteVideo.srcObject = event.stream;
        Snackbar.close();
        VideoChat.remoteVideo.style.background = 'none';
        $('#remote-video-text').text("");
    }
};


var isFullscreen = false;

function openFullscreen() {
    var elem = document.getElementById("remote-video");
    if (!isFullscreen) {
        isFullscreen = true;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen();
        }
    } else {
        isFullscreen = false;
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    }
}

function muteMicrophone() {
    var muted = VideoChat.localStream.getAudioTracks()[0].enabled;
    VideoChat.localStream.getAudioTracks()[0].enabled = !muted;
    const micIcon = document.getElementById("mic-icon");
    const micText = document.getElementById("mic-text");
    if (muted) {
        micIcon.classList.remove("fa-microphone");
        micIcon.classList.add("fa-microphone-slash");
        micText.innerText = "Unmute"
    } else {
        micIcon.classList.add("fa-microphone");
        micIcon.classList.remove("fa-microphone-slash");
        micText.innerText = "Mute"
    }
}

function pauseVideo() {
    var paused = VideoChat.localStream.getVideoTracks()[0].enabled;
    VideoChat.localStream.getVideoTracks()[0].enabled = !paused;
    const micIcon = document.getElementById("video-icon");
    const micText = document.getElementById("video-text");
    if (paused) {
        micIcon.classList.remove("fa-video");
        micIcon.classList.add("fa-video-slash");
        micText.innerText = "Unpause Video"
    } else {
        micIcon.classList.add("fa-video");
        micIcon.classList.remove("fa-video-slash");
        micText.innerText = "Pause Video"
    }
}


//Show and hide buttons automatically
var timedelay = 1;

function delayCheck() {
    if (timedelay === 5) {
        $('.multi-button').fadeOut();
        timedelay = 1;
    }
    timedelay = timedelay + 1;
}

$(document).mousemove(function () {
    $('.multi-button').fadeIn();
    timedelay = 1;
    clearInterval(_delay);
    _delay = setInterval(delayCheck, 500);
});
_delay = setInterval(delayCheck, 500);


// Show accept webcam snackbar
Snackbar.show({
    text: 'Please allow microphone and webcam access',
    actionText: 'Show Me How',
    width: '455px',
    pos: 'top-right',
    actionTextColor: '#8688ff',
    duration: 50000,
    backgroundColor: '#292B32',
    onActionClick: function (element) {
        window.open('https://getacclaim.zendesk.com/hc/en-us/articles/360001547832-Setting-the-default-camera-on-your-browser', '_blank');
    }
});


//Neomorphic buttons
$(".HoverState").hide();
$(document).ready(function () {
    $(".hoverButton").mouseover(function () {
        $(".HoverState").hide();
        $(this).next().show();
    });
    $(".hoverButton").mouseout(function () {
        $(".HoverState").hide();
    });
});


var mode = "camera";

function swap() {
    if (!VideoChat.connected) {
        alert("You must join a call before you can share your screen.");
        return
    }
    const swapIcon = document.getElementById("swap-icon");
    const swapText = document.getElementById("swap-text");
    if (mode === "camera") {
        mode = "screen";
        swapIcon.classList.remove("fa-desktop");
        swapIcon.classList.add("fa-camera");
        swapText.innerText = "Share Webcam";
        navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        }).then(function (stream) {
            switchStreamHelper(stream);
        });
    } else {
        mode = "camera";
        swapIcon.classList.remove("fa-camera");
        swapIcon.classList.add("fa-desktop");
        swapText.innerText = "Share Screen";
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        }).then(function (stream) {
            switchStreamHelper(stream);
        });
    }
}

function switchStreamHelper(stream) {
    let videoTrack = stream.getVideoTracks()[0];
    if (VideoChat.connected) {
        var sender = VideoChat.peerConnection.getSenders().find(function (s) {
            return s.track.kind === videoTrack.kind;
        });
        sender.replaceTrack(videoTrack);
    }

    VideoChat.localStream = videoTrack;
    VideoChat.localVideo.srcObject = stream;
}


$("#moveable").draggable({containment: 'window'});


// auto get media
VideoChat.requestMediaStream();
