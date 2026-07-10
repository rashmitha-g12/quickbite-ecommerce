/**
 * controllers/productController.js
 * Public read routes + admin write routes for product/inventory management.
 * Search uses regex so no MongoDB text index is required.
 */

const Product = require("../models/Product");

// ── GET /api/products ─────────────────────────────────────────────────────────
// Supports: ?keyword=pizza, ?category=food, ?page=2, ?limit=12
const getProducts = async (req, res, next) => {
  try {
    const pageSize = Number(req.query.limit) || 12;
    const page = Number(req.query.page) || 1;

    const filter = {};

    // ── Keyword search using case-insensitive regex ───────────────────────────
    // Searches both name AND description — no text index needed
    if (req.query.keyword && req.query.keyword.trim() !== "") {
      const escaped = req.query.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } },
      ];
    }

    // ── Category filter ───────────────────────────────────────────────────────
    if (req.query.category && req.query.category !== "all") {
      filter.category = req.query.category;
    }

    if (!req.user || req.user.role !== "admin" || req.query.showAll !== "true") {
      filter.isAvailable = true;
    }
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.json({
      products,
      page,
      pages: Math.ceil(total / pageSize),
      total,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/products/:id ─────────────────────────────────────────────────────
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/products  (admin) ───────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/products/:id  (admin) ────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/products/:id  (admin) ─────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product removed" });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/products/:id/reviews  (user) ────────────────────────────────────
const createProductReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: "Product already reviewed" });
    }

    product.reviews.push({
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    });
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, r) => acc + r.rating, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
};