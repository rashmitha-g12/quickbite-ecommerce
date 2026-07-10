const express = require("express");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
} = require("../controllers/productController");
const { protect, adminOnly, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/")
  .get(optionalAuth, getProducts)
  .post(protect, adminOnly, createProduct);

router.route("/:id")
  .get(getProductById)
  .put(protect, adminOnly, updateProduct)
  .delete(protect, adminOnly, deleteProduct);

router.post("/:id/reviews", protect, createProductReview);

module.exports = router;
