/**
 * config/db.js — MongoDB connection via Mongoose
 */

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 7+ no longer needs these flags but they silence deprecation
      // warnings on some older Atlas versions
    });
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌  MongoDB connection error: ${err.message}`);
    process.exit(1); // Crash fast; let Docker/PM2 restart the container
  }
};

module.exports = connectDB;
