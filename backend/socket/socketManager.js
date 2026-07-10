/**
 * socket/socketManager.js
 * Initialises Socket.IO and manages room-based event broadcasting.
 *
 * Room strategy:
 *   "admins"        — all connected admin clients
 *   "user_<userId>" — a single customer (for private order updates)
 */

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Path aligned with default; can be changed for reverse-proxy setups
    path: "/socket.io",
  });

  // ── Auth middleware for Socket.IO ─────────────────────────────────────────
  // Clients must send { auth: { token: "<jwt>" } } on connect
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role; // stored in token by loginUser
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`⚡  Socket connected: ${socket.id} (user ${socket.userId})`);

    // ── Join appropriate room on connect ───────────────────────────────────
    socket.join(`user_${socket.userId}`);
    if (socket.userRole === "admin") socket.join("admins");

    // ── Client can also join a specific order room for granular tracking ───
    socket.on("join_order", (orderId) => {
      socket.join(`order_${orderId}`);
    });

    socket.on("leave_order", (orderId) => {
      socket.leave(`order_${orderId}`);
    });

    socket.on("disconnect", () => {
      console.log(`⚡  Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Getter used by controllers to emit events after DB writes
const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
};

module.exports = { initSocket, getIO };
