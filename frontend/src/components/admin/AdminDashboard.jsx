/**
 * components/admin/AdminDashboard.jsx
 * KPI cards + revenue chart + live order table for admins.
 */

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, ShoppingBag, TrendingUp, Users,
  RefreshCw, Bell,
} from "lucide-react";
import { orderAPI } from "../../api/services";
import { toast } from "react-toastify";

// ── Status badge helper ───────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending:           "bg-yellow-100 text-yellow-700",
  confirmed:         "bg-blue-100 text-blue-700",
  preparing:         "bg-purple-100 text-purple-700",
  out_for_delivery:  "bg-indigo-100 text-indigo-700",
  delivered:         "bg-green-100 text-green-700",
  cancelled:         "bg-red-100 text-red-700",
};

const StatusBadge = ({ status }) => (
  <span
    className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
      STATUS_COLORS[status] || "bg-gray-100 text-gray-600"
    }`}
  >
    {status?.replace(/_/g, " ")}
  </span>
);

// ── KPI card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, Icon, color }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  </div>
);

const ORDER_STATUSES = [
  "pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled",
];

const AdminDashboard = ({ socket }) => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [liveAlert, setLiveAlert] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await orderAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const { data } = await orderAPI.getAll({ limit: 50 });
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Orders error:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, [fetchStats, fetchOrders]);

  // ── Real-time: new order notification ────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("new_order", (data) => {
      setLiveAlert(`New order from ${data.user} — $${data.total}`);
      fetchOrders();
      fetchStats();
      setTimeout(() => setLiveAlert(null), 5000);
    });

    socket.on("order_status_changed", () => {
      fetchOrders();
    });

    return () => {
      socket.off("new_order");
      socket.off("order_status_changed");
    };
  }, [socket, fetchOrders, fetchStats]);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await orderAPI.updateStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status } : o))
      );
      toast.success("Order status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const totals = stats?.totals;

  return (
    <div className="space-y-6">
      {/* Live alert banner */}
      {liveAlert && (
        <div className="flex items-center gap-3 bg-brand-500 text-white rounded-xl px-4 py-3 text-sm font-medium animate-pulse">
          <Bell className="w-4 h-4 flex-shrink-0" />
          {liveAlert}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={`$${totals?.totalRevenue?.toFixed(0) ?? "—"}`}
          Icon={DollarSign}
          color="bg-green-500"
        />
        <KpiCard
          label="Total Orders"
          value={totals?.totalOrders ?? "—"}
          Icon={ShoppingBag}
          color="bg-brand-500"
        />
        <KpiCard
          label="Avg Order Value"
          value={`$${totals?.avgOrderValue?.toFixed(2) ?? "—"}`}
          Icon={TrendingUp}
          color="bg-purple-500"
        />
        <KpiCard
          label="Status Breakdown"
          value={`${stats?.statusBreakdown?.length ?? 0} types`}
          Icon={Users}
          color="bg-blue-500"
        />
      </div>

      {/* Revenue chart */}
      {stats?.dailyRevenue?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Revenue (Last 7 Days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.dailyRevenue}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, "Revenue"]} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Live Orders</h2>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-500 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loadingOrders ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Order ID</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Update</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      #{order._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {order.user?.name || "—"}
                      <br />
                      <span className="text-xs text-gray-400 font-normal">
                        {order.user?.email}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900">
                      ${order.totalPrice?.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={order.status}
                        disabled={updatingId === order._id}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-brand-500 disabled:opacity-50"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
