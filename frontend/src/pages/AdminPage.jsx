/**
 * pages/AdminPage.jsx
 * Wraps <AdminDashboard> with a role guard and passes the socket instance.
 */

import { Navigate } from "react-router-dom";
import AdminDashboard from "../components/admin/AdminDashboard";
import { useAuth } from "../context/AuthContext";
import useSocket from "../hooks/useSocket";

const AdminPage = () => {
  const { isAdmin, isLoggedIn } = useAuth();
  const socket = useSocket();

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Real-time sales, inventory & order management
            </p>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        </div>
        <AdminDashboard socket={socket} />
      </div>
    </div>
  );
};

export default AdminPage;
