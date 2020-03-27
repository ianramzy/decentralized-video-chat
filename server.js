require('dotenv').config();
var sslRedirect = require('heroku-ssl-redirect');
var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var public = path.join(__dirname, 'public');

// enable ssl redirect
app.use(sslRedirect());


app.get('/', function (req, res) {
    res.sendFile(path.join(public, 'landing.html'));
});

app.get('/newroom', function (req, res) {
    res.sendFile(path.join(public, 'newroom.html'));
});

app.get('/room/*', function (req, res) {
    res.sendFile(path.join(public, 'chat.html'));
});

app.use(express.static('public'));


function logIt(msg, room) {
    console.log(room + ": " + msg)
}

// When a socket connects, set up the specific listeners we will use.
io.on('connection', function (socket) {
    // When a client tries to join a room, only allow them if they are first or
    // second in the room. Otherwise it is full.
    socket.on('join', function (room) {
        logIt('A client joined the room', room);
        var clients = io.sockets.adapter.rooms[room];
        var numClients = typeof clients !== 'undefined' ? clients.length : 0;
        if (numClients === 0) {
            socket.join(room);
        } else if (numClients === 1) {
            socket.join(room);
            // When the client is second to join the room, both clients are ready.
            logIt('Broadcasting ready message', room);
            socket.broadcast.to(room).emit('willInitiateCall', room);
            socket.emit('ready', room).to(room);
            socket.broadcast.to(room).emit('ready', room);
        } else {
            logIt("room already full", room);
            socket.emit('full', room);
        }
    });

    // When receiving the token message, use the Twilio REST API to request an
    // token to get ephemeral credentials to use the TURN server.
    socket.on('token', function (room) {
        logIt('Received token request', room);
        twilio.tokens.create(function (err, response) {
            if (err) {
                logIt(err, room);
            } else {
                logIt('Token generated. Returning it to the browser client', room);
                socket.emit('token', response).to(room);
            }
        });
    });

    // Relay candidate messages
    socket.on('candidate', function (candidate, room) {
        logIt('Received candidate. Broadcasting...', room);
        socket.broadcast.to(room).emit('candidate', candidate);
    });

    // Relay offers
    socket.on('offer', function (offer, room) {
        logIt('Received offer. Broadcasting...', room);
        socket.broadcast.to(room).emit('offer', offer);
    });

    // Relay answers
    socket.on('answer', function (answer, room) {
        logIt('Received answer. Broadcasting...', room);
        socket.broadcast.to(room).emit('answer', answer);
    });
});


var port = process.env.PORT || 3000;
http.listen(port, function () {
    console.log("http://localhost:" + port);
});

