/**
 * models/User.js
 * Stores customer and admin accounts.
 * Passwords are hashed with bcrypt before saving.
 * Password reset uses a crypto token with expiry.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: { type: String, default: "US" },
    },
    phone: String,
    isActive: { type: Boolean, default: true },

    // ── Email OTP verification fields ────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    emailOTP: { type: String, select: false },
    emailOTPExpires: { type: Date, select: false },

    // ── Password reset fields ─────────────────────────────────────────────────
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// ── Pre-save: hash password only when modified ────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance: compare plain-text password with hash ───────────────────────────
userSchema.methods.matchPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance: generate a password reset token ─────────────────────────────────
// Stores a SHA-256 hash in DB; returns the raw token to send via email.
// This way even if the DB is breached, the raw token is not exposed.
userSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Store hashed version in DB
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  // Expires in 15 minutes
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000;

  return rawToken; // send this in the email
};

// ── Instance: generate a 6-digit OTP ─────────────────────────────────────────
userSchema.methods.createEmailOTP = function () {
  // 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store hashed OTP in DB (raw OTP goes in the email)
  const crypto = require("crypto");
  this.emailOTP = crypto.createHash("sha256").update(otp).digest("hex");
  this.emailOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return otp;
};

// ── Omit sensitive fields from JSON ──────────────────────────────────────────
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.emailOTP;
    delete ret.emailOTPExpires;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);