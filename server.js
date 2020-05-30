require("dotenv").config();
var sslRedirect = require("heroku-ssl-redirect");
// Get twillio auth and SID from heroku if deployed, else get from local .env file
var twillioAuthToken =
  process.env.HEROKU_AUTH_TOKEN || process.env.LOCAL_AUTH_TOKEN;
var twillioAccountSID =
  process.env.HEROKU_TWILLIO_SID || process.env.LOCAL_TWILLIO_SID;
var twilio = require("twilio")(twillioAccountSID, twillioAuthToken);
var express = require("express");
var app = express();
const fs = require('fs');
// var http = require("https").createServer({
//   key: fs.readFileSync('/Users/khushjammu/certs/privkey.pem'),
//   cert: fs.readFileSync('/Users/khushjammu/certs/cert.pem')
// }, app);
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var path = require("path");
var public = path.join(__dirname, "public");
const url = require("url");

// enable ssl redirect
app.use(sslRedirect());

// Remove trailing slashes in url
app.use(function (req, res, next) {
  if (req.path.substr(-1) === "/" && req.path.length > 1) {
    let query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

app.get("/", function (req, res) {
  res.sendFile(path.join(public, "landing.html"));
});

app.get("/newcall", function (req, res) {
  res.sendFile(path.join(public, "newcall.html"));
});

app.get("/join/", function (req, res) {
  res.redirect("/");
});

app.get("/join/*", function (req, res) {
  if (Object.keys(req.query).length > 0) {
    logIt("redirect:" + req.url + " to " + url.parse(req.url).pathname);
    res.redirect(url.parse(req.url).pathname);
  } else {
    res.sendFile(path.join(public, "chat.html"));
  }
});

app.get("/notsupported", function (req, res) {
  res.sendFile(path.join(public, "notsupported.html"));
});

app.get("/notsupportedios", function (req, res) {
  res.sendFile(path.join(public, "notsupportedios.html"));
});

// Serve static files in the public directory
app.use(express.static("public"));

// Simple logging function to add room name
function logIt(msg, room) {
  if (room) {
    console.log(room + ": " + msg);
  } else {
    console.log(msg);
  }
}

// When a socket connects, set up the specific listeners we will use.
io.on("connection", function (socket) {
  // When a client tries to join a room, only allow them if they are first or
  // second in the room. Otherwise it is full.
  socket.on("join", function (room) {
    logIt("A client joined the room", room);
    var clients = io.sockets.adapter.rooms[room];
    var numClients = typeof clients !== "undefined" ? clients.length : 0;
    if (numClients === 0) {
      socket.join(room);
      twilio.tokens.create(function (err, response) {
        if (err) {
          logIt(err, room);
        } else {
          logIt("Token generated. Returning it to the browser client", room);
          socket.emit("token", response);
          // Existing callers initiates call with user
        }
      });
    } else if (numClients < 3) {
      socket.join(room);
      logIt("Connected clients", room)
      for (var clientId in clients.sockets) {
        logIt('ID: ' + clientId, room);
      }

      // When the client is not the first to join the room, all clients are ready.
      logIt("Broadcasting ready message", room);
      socket.broadcast.to(room).emit("willInitiateCall", socket.id, room);
      // socket.emit("uuid", socket.id);
      socket.emit("ready", room).to(room);
      socket.broadcast.to(room).emit("ready", room);
    } else {
      logIt("room already full with " + numClients + " people in the room.", room);
      socket.emit("full", room);
    }
  });

  // When receiving the token message, use the Twilio REST API to request an
  // token to get ephemeral credentials to use the TURN server.
  socket.on("token", function (room, uuid) {
    logIt("Received token request", room);
    twilio.tokens.create(function (err, response) {
      if (err) {
        logIt(err, room);
      } else {
        logIt("Token generated. Returning it to the browser client", room);
        socket.emit("token", response, uuid);
      }
    });
  });

  // Relay candidate messages
  socket.on("candidate", function (candidate, room, uuid) {
    logIt("Received candidate. Broadcasting...", room);
    io.to(uuid).emit("candidate", candidate, socket.id);
  });

  // Relay offers
  socket.on("offer", function (offer, room, uuid) {
    logIt("Received offer from " + socket.id + " and emitting to " + uuid, room);
    io.to(uuid).emit("offer", offer, socket.id);
  });

  // Relay answers
  socket.on("answer", function (answer, room, uuid) {
    logIt("Received answer from " + socket.id + " and emitting to " + uuid, room);
    io.to(uuid).emit("answer", answer, socket.id);
  });
});

// Listen for Heroku port, otherwise just use 3000
var port = process.env.PORT || 3000;
http.listen(port, function () {
  console.log("http://localhost:" + port);
});
