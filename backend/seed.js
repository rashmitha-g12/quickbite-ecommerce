/**
 * backend/seed.js
 * Populates MongoDB with demo data for local development.
 *
 * Usage:
 *   node seed.js          → seed
 *   node seed.js --clear  → wipe all collections
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

// ── Demo products ─────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    name: "Margherita Pizza",
    description: "Classic tomato base, fresh mozzarella, and basil leaves.",
    price: 12.99,
    category: "food",
    countInStock: 50,
    prepTime: 20,
    rating: 4.5,
    numReviews: 12,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80",
  },
  {
    name: "Cheeseburger Deluxe",
    description: "Double beef patty, cheddar, lettuce, tomato, pickles.",
    price: 9.99,
    category: "food",
    countInStock: 30,
    prepTime: 15,
    rating: 4.3,
    numReviews: 8,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
  },
  {
    name: "Chicken Biryani",
    description: "Fragrant basmati rice slow-cooked with spiced chicken.",
    price: 14.99,
    category: "food",
    countInStock: 20,
    prepTime: 30,
    rating: 4.8,
    numReviews: 24,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80",
  },
  {
    name: "Mango Lassi",
    description: "Chilled yoghurt drink blended with ripe Alphonso mango.",
    price: 4.49,
    category: "drink",
    countInStock: 100,
    prepTime: 5,
    rating: 4.6,
    numReviews: 19,
    image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&q=80",
  },
  {
    name: "Cold Brew Coffee",
    description: "12-hour steeped single-origin cold brew over ice.",
    price: 5.49,
    category: "drink",
    countInStock: 60,
    prepTime: 2,
    rating: 4.4,
    numReviews: 11,
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80",
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm dark chocolate cake with a gooey molten centre.",
    price: 6.99,
    category: "dessert",
    countInStock: 25,
    prepTime: 12,
    rating: 4.9,
    numReviews: 31,
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80",
  },
  {
    name: "Wireless Earbuds Pro",
    description: "Active noise-cancelling, 30-hour battery, IPX5 water resistant.",
    price: 79.99,
    category: "electronics",
    countInStock: 15,
    prepTime: 0,
    rating: 4.2,
    numReviews: 7,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80",
  },
  {
    name: "Classic White Tee",
    description: "100% organic cotton, relaxed fit, pre-shrunk.",
    price: 19.99,
    category: "clothing",
    countInStock: 200,
    prepTime: 0,
    rating: 4.0,
    numReviews: 5,
    image: "https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=400&q=80",
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────
const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  Connected to MongoDB");

  // Wipe existing data
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
  ]);
  console.log("🗑   Cleared existing data");

  // Create users
  const adminUser = await User.create({
    name: "Admin User",
    email: "admin@quickbite.com",
    password: "admin123",   // hashed by pre-save hook
    role: "admin",
    isEmailVerified: true,
  });

  const regularUser = await User.create({
    name: "Jane Doe",
    email: "jane@example.com",
    password: "password123",
    role: "user",
    isEmailVerified: true,
    address: {
      street: "123 Main St",
      city: "Mumbai",
      state: "MH",
      zip: "400001",
      country: "IN",
    },
    phone: "+91 9876543210",
  });

  console.log(`👤  Created users: ${adminUser.email}, ${regularUser.email}`);

  // Create products
  const createdProducts = await Product.insertMany(PRODUCTS);
  console.log(`🛒  Created ${createdProducts.length} products`);

  // Create a sample order for Jane
  const sampleOrder = await Order.create({
    user: regularUser._id,
    orderItems: [
      {
        product: createdProducts[0]._id,
        name: createdProducts[0].name,
        image: createdProducts[0].image,
        price: createdProducts[0].price,
        quantity: 2,
      },
      {
        product: createdProducts[3]._id,
        name: createdProducts[3].name,
        image: createdProducts[3].image,
        price: createdProducts[3].price,
        quantity: 1,
      },
    ],
    shippingAddress: {
      street: "123 Main St",
      city: "Mumbai",
      zip: "400001",
      country: "IN",
    },
    paymentMethod: "upi",
    itemsPrice: 30.47,
    taxPrice: 3.05,
    shippingPrice: 0,
    totalPrice: 33.52,
    isPaid: true,
    paidAt: new Date(),
    status: "preparing",
  });

  console.log(`📦  Created sample order: #${sampleOrder._id.toString().slice(-6).toUpperCase()}`);

  console.log("\n🎉  Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Admin    → admin@quickbite.com / admin123");
  console.log("  Customer → jane@example.com / password123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
  process.exit(0);
};

// ── Clear function ────────────────────────────────────────────────────────────
const clear = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
  ]);
  console.log("🗑   All collections cleared");
  await mongoose.disconnect();
  process.exit(0);
};

// ── Entry ─────────────────────────────────────────────────────────────────────
if (process.argv.includes("--clear")) {
  clear().catch((err) => { console.error(err); process.exit(1); });
} else {
  seed().catch((err) => { console.error(err); process.exit(1); });
}
