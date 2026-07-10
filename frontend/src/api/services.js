/**
 * api/services.js
 * Typed wrappers around every backend endpoint.
 */

import client from "./client";

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => client.post("/api/users/register", data),
  login: (data) => client.post("/api/users/login", data),
  getProfile: () => client.get("/api/users/profile"),
  updateProfile: (data) => client.put("/api/users/profile", data),

  // OTP signup
  sendOTP: (data) => client.post("/api/users/send-otp", data),
  verifyOTP: (data) => client.post("/api/users/verify-otp", data),
  resendOTP: (email) => client.post("/api/users/resend-otp", { email }),

  // OTP forgot password
  forgotPassword: (email) => client.post("/api/users/forgot-password", { email }),
  verifyForgotOTP: (data) => client.post("/api/users/verify-forgot-otp", data),
  resetPasswordOTP: (data) => client.post("/api/users/reset-password-otp", data),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productAPI = {
  getAll: (params) => client.get("/api/products", { params }),
  getById: (id) => client.get(`/api/products/${id}`),
  create: (data) => client.post("/api/products", data),
  update: (id, data) => client.put(`/api/products/${id}`, data),
  remove: (id) => client.delete(`/api/products/${id}`),
  review: (id, data) => client.post(`/api/products/${id}/reviews`, data),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderAPI = {
  create: (data) => client.post("/api/orders", data),
  getMyOrders: () => client.get("/api/orders/my"),
  getById: (id) => client.get(`/api/orders/${id}`),
  pay: (id, result) => client.put(`/api/orders/${id}/pay`, result),
  getAll: (params) => client.get("/api/orders", { params }),
  getStats: () => client.get("/api/orders/stats"),
  updateStatus: (id, status, note) => client.put(`/api/orders/${id}/status`, { status, note }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getUsers: () => client.get("/api/users"),
  deleteUser: (id) => client.delete(`/api/users/${id}`),
};