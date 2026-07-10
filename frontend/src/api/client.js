/**
 * api/client.js
 * Preconfigured Axios instance.
 * Automatically attaches the JWT from localStorage to every request.
 */

import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:5000",
  timeout: 15000,
});

// ── Request interceptor: inject Authorization header ──────────────────────────
client.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      const { token } = JSON.parse(userInfo);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 (token expired) globally ────────────────
// ── Response interceptor: handle 401 globally ────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const urlString = (error.config?.url || "").toLowerCase();
    const isLoginRequest = urlString.includes("login");

    // Only redirect if a token expires on a protected page. NEVER redirect during a login attempt!
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("userInfo");
      window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

export default client;
