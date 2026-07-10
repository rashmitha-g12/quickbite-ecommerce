/**
 * server.js — Entry point
 * Boots Express, connects MongoDB, mounts routes, and initialises Socket.IO.
 */

require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./socket/socketManager");

const PORT = process.env.PORT || 5000;

// ── 1. Connect to MongoDB ─────────────────────────────────────────────────────
connectDB();

// ── 2. Create raw HTTP server so Socket.IO can share it ──────────────────────
const server = http.createServer(app);

// ── 3. Attach Socket.IO ───────────────────────────────────────────────────────
initSocket(server);

// ── 4. Start listening ────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀  Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown on SIGTERM (Docker stop)
process.on("SIGTERM", () => {
  console.log("SIGTERM received – shutting down gracefully");
  server.close(() => process.exit(0));
});
