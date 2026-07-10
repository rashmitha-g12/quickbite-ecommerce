/**
 * backend/createAdmin.js
 * Interactive CLI script to create an admin account.
 *
 * Usage:
 *   node createAdmin.js
 *
 * Or with arguments (no prompts):
 *   node createAdmin.js --name "Admin Name" --email admin@example.com --password secret123
 */

require("dotenv").config();
const mongoose  = require("mongoose");
const readline  = require("readline");
const User      = require("./models/User");
const connectDB = require("./config/db");

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

const run = async () => {
  await connectDB();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  QuickBite — Create Admin Account");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Get details from args or prompt
  const name     = getArg("--name")     || await ask("  Admin Name     : ");
  const email    = getArg("--email")    || await ask("  Admin Email    : ");
  const password = getArg("--password") || await ask("  Admin Password : ");

  rl.close();

  // Validate
  if (!name.trim() || !email.trim() || !password.trim()) {
    console.error("\n❌  All fields are required.\n");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("\n❌  Password must be at least 6 characters.\n");
    process.exit(1);
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    console.error("\n❌  Invalid email address.\n");
    process.exit(1);
  }

  // Check if email already exists
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    if (existing.role === "admin") {
      console.log(`\n⚠️   ${email} is already an admin account.\n`);
    } else {
      // Upgrade existing user to admin
      existing.role            = "admin";
      existing.isEmailVerified = true;
      await existing.save({ validateBeforeSave: false });
      console.log(`\n✅  Existing user ${email} upgraded to admin role.\n`);
    }
    await mongoose.disconnect();
    process.exit(0);
  }

  // Create new admin
  await User.create({
    name:            name.trim(),
    email:           email.toLowerCase().trim(),
    password:        password.trim(),
    role:            "admin",
    isEmailVerified: true,   // admins don't need OTP verification
  });

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ✅  Admin account created!");
  console.log(`  Email    : ${email}`);
  console.log(`  Password : ${password}`);
  console.log("  Role     : admin");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("  Login at: http://127.0.0.1:5173/login\n");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});