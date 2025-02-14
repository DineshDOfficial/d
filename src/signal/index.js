const express = require("express");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));

const io = socketIo(server, {
  cors: { origin: "*" }
});

let peers = {}; // Store peer connections

io.on("connection", (socket) => {
  const peerId = uuidv4();
  peers[peerId] = socket.id;

  console.log(`Peer connected: ${peerId}`);
  
  // Send the assigned peer ID
  socket.emit("peer-id", peerId);

  // Send all active peers (except self)
  socket.emit("active-peers", Object.keys(peers).filter(id => id !== peerId));

  // Notify all peers about the new peer
  socket.broadcast.emit("new-peer", peerId);

  // Handle WebRTC signaling
  socket.on("signal", ({ to, signal }) => {
    if (peers[to]) {
      io.to(peers[to]).emit("signal", { from: peerId, signal });
    }
  });

  // Handle peer disconnection
  socket.on("disconnect", () => {
    console.log(`Peer disconnected: ${peerId}`);
    delete peers[peerId];
    io.emit("peer-disconnected", peerId);
  });
});

server.listen(4001, () => console.log("Signaling server running on port 4001"));
