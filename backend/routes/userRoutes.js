const express = require("express");
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  sendOTP,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
  getAllUsers,
  deleteUser,
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// ── Public auth ───────────────────────────────────────────────────────────────
router.post("/register", registerUser);
router.post("/login", loginUser);

// ── OTP signup flow ───────────────────────────────────────────────────────────
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// ── OTP forgot password flow ──────────────────────────────────────────────────
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOTP);
router.post("/reset-password-otp", resetPassword);

// ── Protected ─────────────────────────────────────────────────────────────────
router.route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/", protect, adminOnly, getAllUsers);
router.delete("/:id", protect, adminOnly, deleteUser);

module.exports = router;