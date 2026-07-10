/**
 * models/Product.js
 * Represents a menu / shop item with inventory tracking.
 * Search is handled via regex in the controller — no text index needed.
 */

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["food", "drink", "dessert", "electronics", "clothing", "other"],
    },
    image: {
      type: String,
      default: "https://via.placeholder.com/400x300?text=Product",
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    reviews: [reviewSchema],
    isAvailable: { type: Boolean, default: true },
    prepTime: { type: Number, default: 15 },
  },
  { timestamps: true }
);

// ── Only index category + availability for fast filter queries ────────────────
// Removed $text index — search now uses regex which needs no index
productSchema.index({ category: 1, isAvailable: 1 });

module.exports = mongoose.model("Product", productSchema);