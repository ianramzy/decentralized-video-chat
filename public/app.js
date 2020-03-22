if (!location.hash) {
    // Generate random room name if needed
    var adjectives = ["small", "big", "large", "smelly", "new", "happy", "shiny", "old", "clean", "nice", "bad", "cool",
        "hot", "cold", "warm", "hungry", "slow", "fast", "red", "white", "black", "blue", "green"];
    var nouns = ["dog", "bat", "wrench", "apple", "pear", "ghost", "cat", "wolf", "squid", "goat", "snail", "hat",
        "sock", "plum", "bear", "snake", "turtle", "horse", "spoon", "fork", "spider", "tree", "chair", "table",
        "couch", "towel"];
    var adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    var noun = nouns[Math.floor(Math.random() * nouns.length)];
    location.hash = adjective + noun
}
const roomHash = location.hash.substring(1);

function logIt(message, error) {
    // console.log(message);
    // Add to logs on page
    // let logs = document.getElementById('logs');
    // let tmp = document.createElement('P');
    // tmp.innerText = message;
    // if (error) {
    //     tmp.classList.add('error');
    // }
    // logs.appendChild(tmp);
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
    // videoButton: document.getElementById('get-video'),
    // screenButton: document.getElementById('get-screen'),
    // callButton: document.getElementById('call'),

    // Call to getUserMedia (provided by adapter.js for cross browser compatibility)
    // asking for access to both the video and audio streams. If the request is
    // accepted callback to the onMediaStream function, otherwise callback to the
    // noMediaStream function.
    requestMediaStream: function (event) {
        console.log("requestMediaStream");
        navigator.mediaDevices
            .getUserMedia({video: true, audio: true})
            .then(stream => {
                VideoChat.onMediaStream(stream);
            })
            .catch(error => {
                VideoChat.noMediaStream(error);
            });
    },

    requestScreenStream: function (event) {
        navigator.mediaDevices
            .getDisplayMedia({video: true, audio: true})
            .then(stream => {
                VideoChat.onMediaStream(stream);
            })
            .catch(error => {
                VideoChat.noMediaStream(error);
            });
    },

    // The onMediaStream function receives the media stream as an argument.
    onMediaStream: function (stream) {
        console.log("onMediaStream");
        // VideoChat.localVideo.volume = 0; // Turn the volume down to 0 to avoid echoes.
        VideoChat.localStream = stream;
        // VideoChat.videoButton.setAttribute('disabled', 'disabled');
        // VideoChat.screenButton.setAttribute('disabled', 'disabled');
        // Add the stream as video's srcObject.
        VideoChat.localVideo.srcObject = stream;
        // Now we're ready to join the chat room.
        VideoChat.socket.emit('join', roomHash);
        // VideoChat.socket.on('roomtest', (passedRoom) => alert("youre in room: " + passedRoom));
        VideoChat.socket.on('temp', () => alert("temp called"));
        VideoChat.socket.on('full', VideoChat.chatRoomFull);
        VideoChat.socket.on('offer', VideoChat.onOffer);
        VideoChat.socket.on('ready', VideoChat.readyToCall);
        VideoChat.socket.on('willInitiateCall', () => VideoChat.willInitiateCall = true);
    },

    // There's not much to do in this demo if there is no media stream. So let's just stop.
    noMediaStream: function () {
        logIt('No media stream for us.');
    },

    chatRoomFull: function () {
        alert("Chat room is full. Check to make sure you don't have multiple open tabs");
        // VideoChat.socket.disconnect()
        // todo handle this better
    },

    // When we are ready to call, enable the Call button.
    readyToCall: function (event) {
        console.log("readyToCall");
        // VideoChat.callButton.removeAttribute('disabled');
        if (VideoChat.willInitiateCall) {
            VideoChat.startCall()
        }
    },

    // Set up a callback to run when we have the ephemeral token to use Twilio's TURN server.
    startCall: function (event) {
        console.log("startCall");
        logIt('>>> Sending token request...');
        VideoChat.socket.on('token', VideoChat.onToken(VideoChat.createOffer));
        VideoChat.socket.emit('token', roomHash);
        // VideoChat.callButton.disabled = true
    },

    // When we receive the ephemeral token back from the server.
    onToken: function (callback) {
        console.log("onToken");
        return function (token) {
            logIt('<<< Received token');
            // Set up a new RTCPeerConnection using the token's iceServers.
            VideoChat.peerConnection = new RTCPeerConnection({iceServers: token.iceServers});
            // Add the local video stream to the peerConnection.
            VideoChat.peerConnection.addStream(VideoChat.localStream);
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

    // When the peerConnection generates an ice candidate, send it over the socket
    // to the peer.
    onIceCandidate: function (event) {
        console.log("onIceCandidate");
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
        console.log("onCandidate");
        rtcCandidate = new RTCIceCandidate(JSON.parse(candidate));
        logIt(`<<< Received remote ICE candidate (${rtcCandidate.address} - ${rtcCandidate.relatedAddress})`);
        VideoChat.peerConnection.addIceCandidate(rtcCandidate);
    },

    // Create an offer that contains the media capabilities of the browser.
    createOffer: function () {
        console.log("createOffer");
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
        console.log("createAnswer");
        return function () {
            logIt('>>> Creating answer...');
            VideoChat.connected = true;
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
        console.log("onOffer");
        logIt('<<< Received offer');
        VideoChat.socket.on('token', VideoChat.onToken(VideoChat.createAnswer(offer)));
        VideoChat.socket.emit('token', roomHash);
    },

    // When an answer is received, add it to the peerConnection as the remote
    // description.
    onAnswer: function (answer) {
        console.log("onAnswer");
        logIt('<<< Received answer');
        var rtcAnswer = new RTCSessionDescription(JSON.parse(answer));
        VideoChat.peerConnection.setRemoteDescription(rtcAnswer);
        VideoChat.connected = true;
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
        console.log("onAddStream");
        logIt('<<< Received new stream from remote. Adding it...');
        VideoChat.remoteVideo.srcObject = event.stream;
    }
};
// VideoChat.videoButton.addEventListener('click', VideoChat.requestMediaStream, false);
// VideoChat.screenButton.addEventListener('click', VideoChat.requestScreenStream, false);
// VideoChat.callButton.addEventListener('click', VideoChat.startCall, false);

// auto get media
// VideoChat.requestScreenStream();
VideoChat.requestMediaStream();

