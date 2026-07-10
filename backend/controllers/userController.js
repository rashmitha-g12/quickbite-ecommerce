/**
 * controllers/userController.js
 * Auth: register (OTP), login, forgot password (OTP), reset password (OTP).
 * OTP is used consistently for both signup verification and password reset.
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendSignupOTPEmail, sendForgotOTPEmail } = require("../config/emailService");
const { log } = require("console");

// ── Helper ────────────────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ── POST /api/users/register ──────────────────────────────────────────────────
// Legacy direct register — kept for seed script compatibility
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing && existing.isEmailVerified) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const user = existing || new User({ name, email, password });
    user.isEmailVerified = true; // direct register skips OTP (used by seed)
    await user.save();
    const token = signToken(user._id);
    res.status(201).json({ user, token });
  } catch (err) { next(err); }
};

// ── POST /api/users/login ─────────────────────────────────────────────────────
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    if (!user.isEmailVerified) {
      // Resend a fresh OTP automatically
      const otp = user.createEmailOTP();
      await user.save({ validateBeforeSave: false });
      try {
        await sendSignupOTPEmail({ to: user.email, name: user.name, otp, expiresInMinutes: 10 });
      } catch (e) {
        console.error("OTP resend error:", e.message);
      }
      return res.status(401).json({
        message: "Your email is not verified. We've sent a new OTP to your inbox.",
        needsVerification: true,
        email: user.email,
      });
    }
    const token = signToken(user._id);
    user.password = undefined;
    res.json({ user, token });
  } catch (err) { next(err); }
};

// ── GET /api/users/profile ────────────────────────────────────────────────────
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) { next(err); }
};

// ── PUT /api/users/profile ────────────────────────────────────────────────────
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.address) user.address = { ...user.address, ...req.body.address };
    if (req.body.password) user.password = req.body.password;
    const updated = await user.save();
    res.json({ user: updated, token: signToken(updated._id) });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// OTP SIGNUP FLOW
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/users/send-otp ──────────────────────────────────────────────────
// Step 1: validate details, create unverified record, send OTP
const sendOTP = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing && existing.isEmailVerified)
      return res.status(400).json({ message: "Email is already registered" });

    const user = existing || new User({ name, email: email.toLowerCase().trim(), password, isEmailVerified: false });
    if (existing) { user.name = name; user.password = password; }

    const otp = user.createEmailOTP();
    await user.save({ validateBeforeSave: false });

    try {
      await sendSignupOTPEmail({ to: user.email, name: user.name, otp, expiresInMinutes: 10 });
      res.json({ message: "OTP sent to your email address" });
    } catch (emailErr) {
      user.emailOTP = undefined; user.emailOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("OTP email error:", emailErr.message);
      return res.status(500).json({ message: "Failed to send OTP. Check your email configuration." });
    }
  } catch (err) { next(err); }
};

// ── POST /api/users/verify-otp ────────────────────────────────────────────────
// Step 2: verify OTP → mark email verified → return JWT
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const hashedOTP = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      emailOTP: hashedOTP,
      emailOTPExpires: { $gt: Date.now() },
    }).select("+emailOTP +emailOTPExpires +password");

    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });

    user.isEmailVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save();

    const token = signToken(user._id);
    user.password = undefined;
    res.status(201).json({ message: "Email verified! Welcome to QuickBite.", user, token });
  } catch (err) { next(err); }
};

// ── POST /api/users/resend-otp ────────────────────────────────────────────────
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isEmailVerified: false,
    }).select("+emailOTP +emailOTPExpires");

    if (!user)
      return res.status(400).json({ message: "No pending registration found for this email." });

    const otp = user.createEmailOTP();
    await user.save({ validateBeforeSave: false });
    await sendSignupOTPEmail({ to: user.email, name: user.name, otp, expiresInMinutes: 10 });
    res.json({ message: "New OTP sent to your email address" });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// OTP FORGOT PASSWORD FLOW
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/users/forgot-password ──────────────────────────────────────────
// Sends a 6-digit OTP to email for password reset
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Please provide your email address" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return same message to prevent email enumeration
    if (!user) {
      return res.json({ message: "If that email is registered, an OTP has been sent." });
    }

    const otp = user.createEmailOTP();
    await user.save({ validateBeforeSave: false });

    try {
      await sendForgotOTPEmail({ to: user.email, name: user.name, otp, expiresInMinutes: 10 });
      res.json({ message: "If that email is registered, an OTP has been sent." });
    } catch (emailErr) {
      user.emailOTP = undefined; user.emailOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("OTP email error:", emailErr.message);
      return res.status(500).json({ message: "Failed to send OTP. Check your email configuration." });
    }
  } catch (err) { next(err); }
};

// ── POST /api/users/verify-forgot-otp ────────────────────────────────────────
// Verifies OTP only — frontend calls this to confirm OTP before password step
const verifyForgotOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const hashedOTP = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      emailOTP: hashedOTP,
      emailOTPExpires: { $gt: Date.now() },
    }).select("+emailOTP +emailOTPExpires");

    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });

    // OTP valid — don't clear yet, needed for reset step
    res.json({ message: "OTP verified successfully" });
  } catch (err) { next(err); }
};

// ── POST /api/users/reset-password-otp ───────────────────────────────────────
// Verifies OTP + sets new password atomically
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password, confirmPassword } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });
    if (!password) return res.status(400).json({ message: "New password is required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

    const hashedOTP = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      emailOTP: hashedOTP,
      emailOTPExpires: { $gt: Date.now() },
    }).select("+emailOTP +emailOTPExpires +password");

    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });

    user.password = password;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save();

    const token = signToken(user._id);
    user.password = undefined;
    res.json({ message: "Password reset successfully! You are now logged in.", user, token });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) { next(err); }
};

module.exports = {
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
};