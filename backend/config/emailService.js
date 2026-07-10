/**
 * config/emailService.js
 * Two distinct OTP email templates:
 *   1. sendSignupOTPEmail  — account verification (signup)
 *   2. sendForgotOTPEmail  — password reset
 *
 * Anti-spam headers included to reduce Gmail spam classification.
 */

const nodemailer = require("nodemailer");

// ── Transporter ───────────────────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Anti-spam: set a proper sender name and connection options
    tls: { rejectUnauthorized: false },
  });

// ── Shared HTML wrapper ───────────────────────────────────────────────────────
const emailWrapper = (headerTitle, headerSubtitle, bodyHTML, to) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QuickBite</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:16px;overflow:hidden;
               box-shadow:0 4px 24px rgba(0,0,0,0.06);max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#f97316,#ea580c);
                     padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;
                        letter-spacing:-0.3px;">🍕 QuickBite</h1>
            <p style="margin:6px 0 0;color:#fed7aa;font-size:13px;font-weight:500;">
              ${headerTitle}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            ${bodyHTML}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:18px 40px;
                     border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
              © ${new Date().getFullYear()} QuickBite · All rights reserved<br/>
              This email was sent to <span style="color:#6b7280;">${to}</span><br/>
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── OTP box HTML (reused in both templates) ───────────────────────────────────
const otpBox = (otp, expiresInMinutes) => `
  <div style="text-align:center;margin:28px 0;">
    <div style="display:inline-block;background:#fff7ed;
                border:2px dashed #f97316;border-radius:16px;padding:20px 48px;">
      <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;font-weight:700;
                letter-spacing:2px;text-transform:uppercase;">Your OTP Code</p>
      <p style="margin:0;color:#f97316;font-size:44px;font-weight:900;
                letter-spacing:12px;font-family:monospace;">${otp}</p>
    </div>
  </div>
  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;
              padding:13px 18px;margin-bottom:20px;">
    <p style="margin:0;color:#c2410c;font-size:13px;">
      ⏰ This code expires in <strong>${expiresInMinutes} minutes</strong>.
      Never share it with anyone — QuickBite will never ask for your OTP.
    </p>
  </div>`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. SIGNUP OTP EMAIL
// ─────────────────────────────────────────────────────────────────────────────
const sendSignupOTPEmail = async ({ to, name, otp, expiresInMinutes = 10 }) => {
  const transporter = createTransporter();

  const body = `
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px;font-weight:700;">
      Verify your email address
    </h2>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;line-height:1.6;">
      Hi <strong>${name}</strong>, welcome to QuickBite!
    </p>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;line-height:1.6;">
      Enter the code below to complete your account registration.
    </p>
    ${otpBox(otp, expiresInMinutes)}
    <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
      Didn't sign up for QuickBite? No action needed — just ignore this email.
    </p>`;

  await transporter.sendMail({
    from: `"QuickBite" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} — Verify your QuickBite account`,
    html: emailWrapper("Account Verification", "", body, to),
    text: `Hi ${name},\n\nWelcome to QuickBite!\n\nYour email verification OTP is: ${otp}\n\nExpires in ${expiresInMinutes} minutes. Never share this code.\n\nIf you didn't sign up, ignore this email.`,
    // Anti-spam headers
    headers: {
      "X-Priority": "3",
      "X-Mailer": "QuickBite Mailer",
      "List-Unsubscribe": `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. FORGOT PASSWORD OTP EMAIL
// ─────────────────────────────────────────────────────────────────────────────
const sendForgotOTPEmail = async ({ to, name, otp, expiresInMinutes = 10 }) => {
  const transporter = createTransporter();

  const body = `
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px;font-weight:700;">
      Reset your password
    </h2>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;line-height:1.6;">
      Hi <strong>${name}</strong>, we received a request to reset your QuickBite password.
    </p>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;line-height:1.6;">
      Use the code below to set a new password.
    </p>
    ${otpBox(otp, expiresInMinutes)}
    <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
      Didn't request a password reset? Your account is safe — just ignore this email.
    </p>`;

  await transporter.sendMail({
    from: `"QuickBite" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} — Reset your QuickBite password`,
    html: emailWrapper("Password Reset", "", body, to),
    text: `Hi ${name},\n\nYour QuickBite password reset OTP is: ${otp}\n\nExpires in ${expiresInMinutes} minutes. Never share this code.\n\nIf you didn't request this, ignore this email.`,
    headers: {
      "X-Priority": "3",
      "X-Mailer": "QuickBite Mailer",
      "List-Unsubscribe": `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`,
    },
  });
};

// ── Verify transporter on server start ───────────────────────────────────────
const verifyEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log("✅  Email service ready");
  } catch (err) {
    console.warn("⚠️   Email service not configured:", err.message);
    console.warn("    Set EMAIL_USER and EMAIL_PASS in backend/.env");
  }
};

module.exports = {
  sendSignupOTPEmail,
  sendForgotOTPEmail,
  verifyEmailConnection,
};