/**
 * models/Order.js
 * Tracks customer orders end-to-end.
 * Status transitions drive Socket.IO real-time events.
 */

const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  image: String,
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "Order must contain at least one item",
      },
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      zip: { type: String, required: true },
      country: { type: String, default: "US" },
    },
    paymentMethod: {
      type: String,
      enum: ["card", "cash", "upi", "wallet"],
      default: "card",
    },
    paymentResult: {
      id: String,
      status: String,
      updateTime: String,
      email: String,
    },
    // Pricing breakdown
    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // ── Order lifecycle ───────────────────────────────────────────────────────
    // Each status change is broadcast via Socket.IO
    status: {
      type: String,
      enum: [
        "pending",      // Just placed, awaiting confirmation
        "confirmed",    // Restaurant/store accepted
        "preparing",    // Being prepared / packed
        "out_for_delivery", // Driver picked up
        "delivered",    // Completed
        "cancelled",    // Cancelled by user or admin
      ],
      default: "pending",
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String, // e.g. "Driver: John is on the way"
      },
    ],
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,
    estimatedDelivery: Date,
  },
  { timestamps: true }
);

// ── Pre-save: automatically log status changes to history ─────────────────────
orderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});

// ── Indexes for admin dashboard queries ───────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
