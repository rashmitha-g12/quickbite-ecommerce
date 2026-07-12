/**
 * pages/LoginPage.jsx
 * Login + Register (with OTP verification) + Forgot Password (with OTP reset).
 * OTP is used consistently for both flows — no magic links needed.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Eye, EyeOff, Package, Mail, Lock, User, Phone,
  CheckCircle, XCircle, ArrowRight, ShieldCheck, ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api/services";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getPasswordStrength = (password) => {
  let score = 0;
  if (!password) return { score: 0, label: "", color: "" };
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: "Very Weak", color: "bg-red-500" };
  if (score === 2) return { score, label: "Weak", color: "bg-orange-500" };
  if (score === 3) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score === 4) return { score, label: "Strong", color: "bg-blue-500" };
  return { score, label: "Very Strong", color: "bg-green-500" };
};

const validateEmail = (emailRaw) => {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return "Email address is required";
  if (email.length > 254) return "Email address is too long";
  if (!email.includes("@")) return "Email must contain @";
  if (email.split("@").length > 2) return "Email cannot contain more than one @";
  if (email.startsWith("@") || email.endsWith("@")) return "Enter a valid email address";

  const [local, domain] = email.split("@");

  if (domain === "gmail.com") {
    if (local.length < 6) return "Gmail username must be at least 6 characters";
    if (local.length > 30) return "Gmail username cannot exceed 30 characters";
    if (!/[a-zA-Z]/.test(local)) return "Gmail username must contain at least one letter";
    if (/[^a-z0-9.]/.test(local)) return "Gmail only allows letters, numbers, and dots";
    if (local.startsWith(".") || local.endsWith(".")) return "Gmail username cannot start or end with a dot";
    if (/\.{2,}/.test(local)) return "Gmail username cannot contain consecutive dots";
  } else {
    if (local.length < 2) return "The part before @ must be at least 2 characters";
    if (local.length > 64) return "The part before @ is too long";
    if (local.endsWith(".")) return "Email cannot end with a dot before @";
    if (/\.{2,}/.test(local)) return "Email cannot contain consecutive dots";
    const domainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) return "Enter a valid domain (e.g. gmail.com, outlook.com)";

    const typoMap = {
      "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com",
      "gnail.com": "gmail.com", "gmail.con": "gmail.com", "gmail.co": "gmail.com",
      "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.con": "yahoo.com",
      "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.con": "hotmail.com",
      "outloo.com": "outlook.com", "outlok.com": "outlook.com", "outlook.con": "outlook.com",
      "iclod.com": "icloud.com", "icloud.con": "icloud.com",
    };
    if (typoMap[domain]) return `Did you mean ${local}@${typoMap[domain]}?`;
  }
  return "";
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

const PasswordReq = ({ met, text }) => (
  <div className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-green-600" : "text-gray-400"}`}>
    {met ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {text}
  </div>
);

const InputField = ({ label, type, value, onChange, placeholder, error, icon: Icon, hint }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
        {label}
        {hint && <span className="text-xs font-normal text-gray-400">({hint})</span>}
      </label>
      <div className="relative">
        {Icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><Icon className="w-4 h-4" /></div>}
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full ${Icon ? "pl-10" : "pl-4"} ${isPassword ? "pr-11" : "pr-4"}
            py-3 rounded-xl border text-sm transition-all
            focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
            placeholder:text-gray-300
            ${error ? "border-red-400 bg-red-50/30" : "border-gray-200 hover:border-gray-300"}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OTP Input — 6 individual boxes, auto-focus & auto-advance
// ─────────────────────────────────────────────────────────────────────────────
const OTPInput = ({ value, onChange, error }) => {
  const refs = Array.from({ length: 6 }, () => useRef(null));

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      if (!value[i] && i > 0) {
        refs[i - 1].current?.focus();
        const next = [...value]; next[i - 1] = ""; onChange(next);
      }
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) { refs[i - 1].current?.focus(); return; }
    if (e.key === "ArrowRight" && i < 5) { refs[i + 1].current?.focus(); return; }
  };

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...value];
    pasted.split("").forEach((d, i) => { next[i] = d; });
    onChange(next);
    const lastFilled = Math.min(pasted.length, 5);
    refs[lastFilled].current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-center">
        {value.map((digit, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            autoFocus={i === 0}
            className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 transition-all
              focus:outline-none focus:ring-2 focus:ring-brand-500/20
              ${digit ? "border-brand-500 bg-brand-50 text-brand-600" : "border-gray-200 text-gray-800"}
              ${error ? "border-red-400 bg-red-50" : ""}
              py-3`}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1"><XCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Resend timer hook
// ─────────────────────────────────────────────────────────────────────────────
const useResendTimer = (seconds = 30) => {
  const [timer, setTimer] = useState(0);
  const start = useCallback(() => setTimer(seconds), [seconds]);
  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);
  return { timer, start };
};

// ─────────────────────────────────────────────────────────────────────────────
// LEFT PANEL — decorative branding strip
// ─────────────────────────────────────────────────────────────────────────────
const LeftPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-orange-700 flex-col justify-between p-12 relative overflow-hidden">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
    </div>
    <div className="relative z-10 flex items-center gap-3">
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
        <Package className="w-6 h-6 text-white" />
      </div>
      <span className="text-white text-2xl font-extrabold">QuickBite</span>
    </div>
    <div className="relative z-10 space-y-8">
      <div>
        <h2 className="text-4xl font-extrabold text-white leading-tight">Fresh Food,<br />Fast Delivery</h2>
        <p className="text-orange-100 mt-3 text-lg">Order your favourite meals and get them delivered in minutes.</p>
      </div>
      <div className="space-y-4">
        {[
          { emoji: "⚡", text: "Real-time order tracking" },
          { emoji: "🔒", text: "Secure OTP verification" },
          { emoji: "🍕", text: "100+ menu items available" },
          { emoji: "🚀", text: "Delivered in under 30 mins" },
        ].map(f => (
          <div key={f.text} className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center text-lg">{f.emoji}</div>
            <span className="text-white/90 font-medium">{f.text}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="relative z-10 flex items-center gap-2 text-orange-100 text-sm">
      <ShieldCheck className="w-4 h-4" />
      <span>OTP-verified accounts · Your data is encrypted</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// OTP STEP — used for BOTH signup verification & forgot password reset
// ─────────────────────────────────────────────────────────────────────────────
const OTPStep = ({ email, flow, onBack, onSuccess }) => {
  // flow: "signup" | "forgot"
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Forgot-only: new password fields
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false); // forgot: step a=OTP, step b=new pw

  const { timer, start } = useResendTimer(30);
  const strength = getPasswordStrength(newPw);

  useEffect(() => { start(); }, []); // start timer on mount


  const handleResend = async () => {
    if (timer > 0) return;
    try {
      if (flow === "signup") {
        await authAPI.resendOTP(email);
      } else {
        await authAPI.forgotPassword(email);
      }
      toast.success("New OTP sent!");
      setOtp(["", "", "", "", "", ""]);
      setError("");
      start();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  // ── Signup: verify OTP → create account ──────────────────────────────────
  const handleSignupVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      const { data } = await authAPI.verifyOTP({ email, otp: code });
      // Note: localStorage is used for simplicity in this learning project.
      // Production apps should use httpOnly cookies for better security.
      localStorage.setItem("userInfo", JSON.stringify(data));
      setSuccess(true);
      toast.success("Email verified! Welcome to QuickBite 🎉");
      setTimeout(() => onSuccess(data), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP. Try again.");
    } finally { setLoading(false); }
  };

  // ── Forgot step A: verify OTP only ───────────────────────────────────────
  const handleForgotVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      await authAPI.verifyForgotOTP({ email, otp: code });
      setOtpVerified(true);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP. Try again.");
    } finally { setLoading(false); }
  };

  // ── Forgot step B: set new password ──────────────────────────────────────
  const handleForgotSetPassword = async () => {
    if (!newPw) { setPwError("New password is required"); return; }
    if (newPw.length < 6) { setPwError("Minimum 6 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    setLoading(true); setPwError("");
    try {
      const code = otp.join("");
      const { data } = await authAPI.resetPasswordOTP({ email, otp: code, password: newPw, confirmPassword: confirmPw });
      localStorage.setItem("userInfo", JSON.stringify(data));
      setSuccess(true);
      toast.success("Password reset! Logging you in…");
      setTimeout(() => onSuccess(data), 1200);
    } catch (err) {
      setPwError(err.response?.data?.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          {flow === "signup" ? "Account Created!" : "Password Reset!"}
        </h3>
        <p className="text-sm text-gray-500">Redirecting you…</p>
      </div>
    );
  }

  // ── Forgot: new password screen (after OTP verified) ─────────────────────
  if (flow === "forgot" && otpVerified) {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => setOtpVerified(false)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h3 className="text-xl font-bold text-gray-900">Set new password</h3>
          <p className="text-sm text-gray-500 mt-1">OTP verified ✅ Choose a strong new password.</p>
        </div>

        {/* New password */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="password" value={newPw}
              onChange={e => { setNewPw(e.target.value); setPwError(""); }}
              placeholder="Create a strong password"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          {/* Strength bar */}
          {newPw && (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-gray-200"}`} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 bg-gray-50 rounded-lg p-2.5">
                <PasswordReq met={newPw.length >= 6} text="6+ characters" />
                <PasswordReq met={/[A-Z]/.test(newPw)} text="Uppercase letter" />
                <PasswordReq met={/[0-9]/.test(newPw)} text="Number" />
                <PasswordReq met={/[^A-Za-z0-9]/.test(newPw)} text="Special character" />
              </div>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="password" value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setPwError(""); }}
              placeholder="Repeat your password"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          {confirmPw && (
            <p className={`text-xs flex items-center gap-1 font-medium ${newPw === confirmPw ? "text-green-600" : "text-red-500"}`}>
              {newPw === confirmPw
                ? <><CheckCircle className="w-3 h-3" /> Passwords match</>
                : <><XCircle className="w-3 h-3" /> Passwords do not match</>}
            </p>
          )}
          {pwError && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" />{pwError}</p>}
        </div>

        <button onClick={handleForgotSetPassword} disabled={loading}
          className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300
            text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2">
          {loading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Resetting…</> : "Reset Password"}
        </button>
      </div>
    );
  }

  // ── OTP entry screen (signup + forgot step A) ─────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-3">
          <Mail className="w-6 h-6 text-brand-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          {flow === "signup" ? "Verify your email" : "Enter reset OTP"}
        </h3>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-gray-700">{email}</span>.
          {" "}It expires in 10 minutes.
        </p>
      </div>

      {/* OTP boxes */}
      <OTPInput value={otp} onChange={setOtp} error={error} />

      {/* Verify button */}
      <button
        onClick={flow === "signup" ? handleSignupVerify : handleForgotVerifyOTP}
        disabled={loading || otp.join("").length < 6}
        className="w-full py-3.5 bg-brand-500 hover:bg-brand-600
          disabled:bg-gray-200 disabled:cursor-not-allowed
          text-white font-bold rounded-xl transition-all text-sm
          flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
      >
        {loading
          ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Verifying…</>
          : <>{flow === "signup" ? "Verify & Create Account" : "Verify OTP"} <ArrowRight className="w-4 h-4" /></>
        }
      </button>

      {/* Resend */}
      <div className="text-center text-sm text-gray-500">
        Didn't receive the code?{" "}
        {timer > 0 ? (
          <span className="text-gray-400 font-medium">Resend in {timer}s</span>
        ) : (
          <button
            onClick={(e) => { e.currentTarget.disabled = true; handleResend(); }}
            disabled={timer > 0}
            className="text-brand-500 hover:text-brand-600 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            Resend OTP
          </button>
        )}
      </div>

      {/* Spam hint */}
      <p className="text-center text-xs text-gray-400">
        Can't find it? Check your spam / junk folder.
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — email entry → OTPStep (flow="forgot")
// ─────────────────────────────────────────────────────────────────────────────
const ForgotPasswordModal = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setOtpSent(true);
    } catch {
      // Show OTP step regardless to prevent email enumeration
      setOtpSent(true);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100
            flex items-center justify-center text-gray-400 hover:text-gray-600">
          <XCircle className="w-5 h-5" />
        </button>

        {otpSent ? (
          <OTPStep
            email={email.trim().toLowerCase()}
            flow="forgot"
            onBack={() => setOtpSent(false)}
            onSuccess={() => { onClose(); navigate('/login', { replace: true, state: { passwordReset: true } }); }}
          />
        ) : (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Forgot your password?</h2>
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                Enter your email and we'll send a 6-digit OTP to reset your password if the email is registered.
              </p>
            </div>
            <form onSubmit={handleSend} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={email} autoFocus
                    onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                    placeholder="you@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all
                      focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                      ${emailError ? "border-red-400 bg-red-50/30" : "border-gray-200 hover:border-gray-300"}`}
                  />
                </div>
                {emailError && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" />{emailError}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300
                  text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                {loading
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Sending OTP…</>
                  : "Send OTP"}
              </button>
              <button type="button" onClick={onClose}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // OTP step state — null = not started, string = email OTP was sent to
  const [otpEmail, setOtpEmail] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Show contextual message when redirected from OTP flows
  useEffect(() => {
    setLoading(false);
    if (location.state?.verified) {
      toast.success("Account verified! Please sign in to continue. 🎉");
    }
    if (location.state?.passwordReset) {
      toast.success("Password reset! Please sign in with your new password. ✅");
    }
  }, [mode, otpEmail, location, showForgot]);

  const strength = getPasswordStrength(form.password);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (mode === "register") {
      if (!form.name.trim()) e.name = "Full name is required";
      else if (form.name.trim().length < 2) e.name = "At least 2 characters";
      else if (!/^[a-zA-Z\s]+$/.test(form.name)) e.name = "Letters and spaces only";
      if (form.phone && !/^\+?[\d\s\-()]{8,15}$/.test(form.phone)) e.phone = "Enter a valid phone number";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
      if (!agreed) e.agreed = "You must agree to the Terms & Privacy Policy";
    }
    const emailErr = validateEmail(form.email);
    if (emailErr) e.email = emailErr;
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Minimum 6 characters";
    return e;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setErrors({});
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast.success("Welcome back! 👋");
        navigate(from, { replace: true });
      } else {
        // Send OTP — don't create account yet
        await authAPI.sendOTP({ name: form.name, email: form.email, password: form.password });
        toast.success("OTP sent to your email 📧");
        setOtpEmail(form.email.trim().toLowerCase());
      }
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message || "Something went wrong";

      // If email not verified → auto open OTP screen
      if (data?.needsVerification && data?.email) {
        toast.error(msg);
        setOtpEmail(data.email);
        setLoading(false);
        return;
      }

      toast.error(msg);
      if (msg.toLowerCase().includes("email")) setErrors({ email: msg });
      else if (msg.toLowerCase().includes("password")) setErrors({ password: msg });
      else if (msg.toLowerCase().includes("invalid")) setErrors({ email: msg });
      setLoading(false);
      setForm((prev) => ({ ...prev, password: "" }));
    }

  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => { setForm(f => ({ ...f, [key]: e.target.value })); if (errors[key]) setErrors(er => ({ ...er, [key]: undefined })); },
    error: errors[key],
  });

  const switchMode = (newMode) => {
    setMode(newMode); setErrors({});
    setForm({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
    setAgreed(false); setOtpEmail(null);
  };

  // ── OTP step for signup ───────────────────────────────────────────────────
  if (otpEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex">
        <LeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-brand-500">QuickBite</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <OTPStep
                email={otpEmail}
                flow="signup"
                onBack={() => setOtpEmail(null)}
                onSuccess={() => { navigate('/login', { replace: true, state: { verified: true } }); }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex">
      <LeftPanel />

      {/* Forgot Password Modal */}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-brand-500">QuickBite</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900">
              {mode === "login" ? "Welcome back 👋" : "Create your account"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "login" ? "Sign in to continue to QuickBite" : "Join thousands of happy customers"}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
            {[{ key: "login", label: "Sign In" }, { key: "register", label: "Create Account" }].map(m => (
              <button key={m.key} onClick={() => switchMode(m.key)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === m.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {mode === "register" && (
              <InputField label="Full Name" type="text" placeholder="Jane Doe" icon={User} {...field("name")} />
            )}

            <InputField label="Email Address" type="email" placeholder="you@example.com" icon={Mail} {...field("email")} />

            {/* Live email hint */}
            {form.email && !errors.email && (() => {
              const v = form.email.trim().toLowerCase();
              const quick = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v);
              if (!quick && v.includes("@")) return (
                <p className="text-xs text-yellow-600 flex items-center gap-1 -mt-2">
                  <XCircle className="w-3 h-3" /> Complete the email — e.g. name@gmail.com
                </p>
              );
              if (quick) return (
                <p className="text-xs text-green-600 flex items-center gap-1 -mt-2">
                  <CheckCircle className="w-3 h-3" /> Looks good!
                </p>
              );
              return null;
            })()}

            <InputField label="Password" type="password"
              placeholder={mode === "register" ? "Create a strong password" : "Enter your password"}
              icon={Lock} {...field("password")} />

            {/* Password strength (register only) */}
            {mode === "register" && form.password && (
              <div className="space-y-2 -mt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-gray-200"}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength.score <= 1 ? "text-red-500" : strength.score === 2 ? "text-orange-500" :
                  strength.score === 3 ? "text-yellow-600" : strength.score === 4 ? "text-blue-500" : "text-green-600"}`}>
                  {strength.label}
                </p>
                <div className="grid grid-cols-2 gap-1 bg-gray-50 rounded-lg p-3">
                  <PasswordReq met={form.password.length >= 6} text="6+ characters" />
                  <PasswordReq met={/[A-Z]/.test(form.password)} text="Uppercase letter" />
                  <PasswordReq met={/[0-9]/.test(form.password)} text="Number" />
                  <PasswordReq met={/[^A-Za-z0-9]/.test(form.password)} text="Special character" />
                </div>
              </div>
            )}

            {/* Confirm password + phone (register only) */}
            {mode === "register" && (
              <>
                <InputField label="Confirm Password" type="password" placeholder="Repeat your password" icon={Lock} {...field("confirmPassword")} />
                <InputField label="Phone Number" type="tel" placeholder="+91 98765 43210" icon={Phone} hint="optional" {...field("phone")} />
              </>
            )}

            {/* Forgot password link */}
            {mode === "login" && (
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={() => setShowForgot(true)}
                  className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors">
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Terms checkbox (register only) */}
            {mode === "register" && (
              <div className="space-y-1">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input type="checkbox" checked={agreed}
                      onChange={e => { setAgreed(e.target.checked); if (errors.agreed) setErrors(er => ({ ...er, agreed: undefined })); }}
                      className="sr-only" />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${agreed ? "bg-brand-500 border-brand-500" : errors.agreed ? "border-red-400 bg-red-50" : "border-gray-300 group-hover:border-brand-400"}`}>
                      {agreed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 leading-relaxed">
                    I agree to the <span className="text-brand-500 font-medium">Terms of Service</span> and <span className="text-brand-500 font-medium">Privacy Policy</span>. I confirm I am 18 years or older.
                  </span>
                </label>
                {errors.agreed && <p className="text-xs text-red-500 flex items-center gap-1 ml-7"><XCircle className="w-3 h-3" />{errors.agreed}</p>}
              </div>
            )}

            {/* OTP notice for register */}
            {mode === "register" && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>A 6-digit OTP will be sent to your email to verify your account before it's created.</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 mt-2
                bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                disabled:bg-gray-300 disabled:cursor-not-allowed
                text-white font-bold rounded-xl transition-all text-sm
                shadow-lg shadow-brand-500/25">
              {loading
                ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                  {mode === "login" ? "Signing in…" : "Sending OTP…"}</>
                : <>{mode === "login" ? "Sign In" : "Send OTP & Continue"} <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400 font-medium">or continue with</span>
            </div>
          </div>

          {/* Social buttons — disabled */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled title="Google login not available yet"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-100
                  rounded-xl text-sm font-medium text-gray-300 bg-gray-50 cursor-not-allowed select-none">
                <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button type="button" disabled title="GitHub login not available yet"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-100
                  rounded-xl text-sm font-medium text-gray-300 bg-gray-50 cursor-not-allowed select-none">
                <svg className="w-4 h-4 opacity-40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub
              </button>
            </div>
            <p className="text-center text-xs text-gray-400">Social login is not available yet</p>
          </div>

          {/* Switch mode */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="text-brand-500 hover:text-brand-600 font-semibold transition-colors">
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OTP verified · 256-bit SSL · Your data is safe</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;