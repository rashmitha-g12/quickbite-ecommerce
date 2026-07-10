/**
 * controllers/orderController.js
 * Order placement, status updates, and admin reporting.
 * Real-time events are emitted via the shared Socket.IO instance.
 */

const Order = require("../models/Order");
const Product = require("../models/Product");
const { getIO } = require("../socket/socketManager");

// ── POST /api/orders ──────────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    // Recalculate prices server-side (never trust client prices)
    let itemsPrice = 0;
    const verifiedItems = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product ${item.product} not found` });
      }
      if (product.countInStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}"`,
        });
      }
      itemsPrice += product.price * item.quantity;
      verifiedItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: item.quantity,
      });

      // Decrement stock
      product.countInStock -= item.quantity;
      await product.save();
    }

    const taxPrice = +(itemsPrice * 0.1).toFixed(2);           // 10% tax
    const shippingPrice = itemsPrice > 50 ? 0 : 4.99;          // Free above $50
    const totalPrice = +(itemsPrice + taxPrice + shippingPrice).toFixed(2);

    const order = await Order.create({
      user: req.user._id,
      orderItems: verifiedItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    // ── Notify admins via Socket.IO ───────────────────────────────────────────
    getIO().to("admins").emit("new_order", {
      orderId: order._id,
      total: order.totalPrice,
      user: req.user.name,
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/orders/my  (user) ────────────────────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("orderItems.product", "name image");
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/orders/:id  (user / admin) ───────────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name image");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Users can only see their own orders
    if (
      req.user.role !== "admin" &&
      order.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorised" });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/orders/:id/status  (admin) ───────────────────────────────────────
// Body: { status, note }
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    if (note) {
      // Push additional note to the latest statusHistory entry (added by pre-save)
      order.statusHistory[order.statusHistory.length] = {
        status,
        note,
        timestamp: new Date(),
      };
    }

    if (status === "delivered") {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    const updated = await order.save();

    // ── Broadcast to the specific user's room ─────────────────────────────────
    getIO().to(`user_${order.user}`).emit("order_updated", {
      orderId: order._id,
      status: order.status,
      note,
    });

    // ── Also notify all admins ────────────────────────────────────────────────
    getIO().to("admins").emit("order_status_changed", {
      orderId: order._id,
      status: order.status,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/orders/:id/pay  (user) ───────────────────────────────────────────
const markOrderPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      updateTime: req.body.update_time,
      email: req.body.payer?.email_address,
    };
    order.status = "confirmed";

    const updated = await order.save();
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/orders  (admin) ──────────────────────────────────────────────────
const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/orders/stats  (admin) ────────────────────────────────────────────
// Returns headline KPIs for the admin dashboard
const getOrderStats = async (_req, res, next) => {
  try {
    const [totals] = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          avgOrderValue: { $avg: "$totalPrice" },
        },
      },
    ]);

    const statusBreakdown = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Revenue per day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ totals, statusBreakdown, dailyRevenue });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  markOrderPaid,
  getAllOrders,
  getOrderStats,
};
