/**
 * context/AuthContext.jsx
 * Provides user state + login/logout helpers app-wide.
 */

import { createContext, useContext, useState, useCallback } from "react";
import { authAPI } from "../api/services";
import { toast } from "react-toastify";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(() => {
    try {
      const stored = localStorage.getItem("userInfo");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authAPI.login({ email, password });
      // Persist token + basic user info
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUserInfo(data);
      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    localStorage.setItem("userInfo", JSON.stringify(data));
    setUserInfo(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("userInfo");
    setUserInfo(null);
  }, []);

  const isAdmin = userInfo?.user?.role === "admin";
  const isLoggedIn = !!userInfo?.token;

  return (
    <AuthContext.Provider
      value={{ userInfo, login, register, logout, isAdmin, isLoggedIn }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
