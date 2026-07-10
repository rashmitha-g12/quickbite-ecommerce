/**
 * components/layout/Navbar.jsx
 */

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingCart, User, Menu, X, LayoutDashboard,
  LogOut, Package, ShoppingBag,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

const Navbar = () => {
  const { isLoggedIn, isAdmin, userInfo, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const navLink = "hover:text-brand-500 transition-colors";
  const activeLink = "text-brand-500 font-semibold";

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-500">
            <Package className="w-6 h-6" />
            <span>QuickBite</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link to="/" className={`${navLink} ${isActive("/") ? activeLink : ""}`}>
              Menu
            </Link>

            {isLoggedIn && !isAdmin && (
              <Link to="/orders" className={`${navLink} ${isActive("/orders") ? activeLink : ""}`}>
                My Orders
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 ${navLink} ${isActive("/admin") ? activeLink : ""}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/admin/products"
                  className={`flex items-center gap-1.5 ${navLink} ${isActive("/admin/products") ? activeLink : ""}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Products
                </Link>
              </>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link
              to="/checkout"
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isLoggedIn ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">
                  {userInfo?.user?.name?.split(" ")[0]}
                  {isAdmin && (
                    <span className="ml-1.5 text-xs bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-semibold">
                      Admin
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-500"
              >
                <User className="w-4 h-4" />
                Login
              </Link>
            )}

            {/* Mobile burger */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-gray-100"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-3 flex flex-col gap-3 text-sm font-medium text-gray-700">
          <Link to="/" onClick={() => setMenuOpen(false)}>Menu</Link>

          {isLoggedIn && !isAdmin && (
            <Link to="/orders" onClick={() => setMenuOpen(false)}>My Orders</Link>
          )}

          {isAdmin && (
            <>
              <Link to="/admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/admin/products" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Manage Products
              </Link>
            </>
          )}

          {isLoggedIn ? (
            <button onClick={handleLogout} className="text-left text-red-500 flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;