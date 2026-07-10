/**
 * middleware/authMiddleware.js
 * Verifies JWT from the Authorization header and attaches req.user.
 * `adminOnly` further restricts routes to admin role.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── protect ───────────────────────────────────────────────────────────────────
// Usage: router.get("/profile", protect, handler)
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorised – no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user (without password) to request object
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

// ── adminOnly ─────────────────────────────────────────────────────────────────
// Usage: router.get("/stats", protect, adminOnly, handler)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  res.status(403).json({ message: "Access denied – admins only" });
};
// Optional auth — attaches user if token exists but doesn't block if missing
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    }
  } catch {
    // No token or invalid token — continue as guest
  }
  next();
};
module.exports = { protect, adminOnly, optionalAuth };
