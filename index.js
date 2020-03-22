require('dotenv').config();

// Twilio init
var twilio = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

function log(msg, room){
    console.log(room + " - " + msg)

}
// When a socket connects, set up the specific listeners we will use.
io.on('connection', function (socket) {
    // When a client tries to join a room, only allow them if they are first or
    // second in the room. Otherwise it is full.
    socket.on('join', function (room) {
        log('A client joined the room', room);
        var clients = io.sockets.adapter.rooms[room];
        var numClients = typeof clients !== 'undefined' ? clients.length : 0;
        if (numClients === 0) {
            socket.join(room);
            // socket.emit("roomtest", room).to(room)
        } else if (numClients === 1) {
            socket.join(room);
            // socket.emit("roomtest", room).to(room)
            // When the client is second to join the room, both clients are ready.
            log('Broadcasting ready message', room);
            socket.broadcast.to(room).emit('willInitiateCall', room);
            socket.emit('ready', room).to(room);
            socket.broadcast.to(room).emit('ready', room);
        } else {
            log("room already full", room);
            socket.emit('full', room);
        }
    });

    // When receiving the token message, use the Twilio REST API to request an
    // token to get ephemeral credentials to use the TURN server.
    socket.on('token', function () {
        console.log('Received token request');
        twilio.tokens.create(function (err, response) {
            if (err) {
                console.log(err);
            } else {
                // Return the token to the browser.
                console.log('Token generated. Returning it to the client');
                socket.emit('token', response);
            }
        });
    });

    // Relay candidate messages
    socket.on('candidate', function (candidate) {
        console.log('Received candidate. Broadcasting...');
        socket.broadcast.emit('candidate', candidate);
    });

    // Relay offers
    socket.on('offer', function (offer) {
        console.log('Received offer. Broadcasting...');
        socket.broadcast.emit('offer', offer);
    });

    // Relay answers
    socket.on('answer', function (answer) {
        console.log('Received answer. Broadcasting...');
        socket.broadcast.emit('answer', answer);
    });
});

http.listen(3000, function () {
    console.log("http://localhost:3000");
});
