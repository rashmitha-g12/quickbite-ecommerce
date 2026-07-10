/**
 * pages/OrdersPage.jsx
 * Lists a user's orders. Clicking one expands the live status tracker.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import OrderStatusTracker from "../components/orders/OrderStatusTracker";
import { orderAPI } from "../api/services";
import useSocket from "../hooks/useSocket";

const STATUS_COLORS = {
  pending:           "bg-yellow-100 text-yellow-700",
  confirmed:         "bg-blue-100 text-blue-700",
  preparing:         "bg-purple-100 text-purple-700",
  out_for_delivery:  "bg-indigo-100 text-indigo-700",
  delivered:         "bg-green-100 text-green-700",
  cancelled:         "bg-red-100 text-red-700",
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await orderAPI.getMyOrders();
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading orders…</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-400">
        <ShoppingBag className="w-16 h-16 text-gray-200" />
        <p className="font-semibold text-lg">No orders yet</p>
        <Link
          to="/"
          className="text-sm text-brand-500 hover:underline font-medium"
        >
          Browse the menu →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Order header */}
              <button
                onClick={() =>
                  setExpanded((e) => (e === order._id ? null : order._id))
                }
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors text-left"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400">
                      #{order._id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                        STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {order.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-bold text-gray-900">
                      ${order.totalPrice?.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {order.orderItems?.length} item
                      {order.orderItems?.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {expanded === order._id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Expandable detail */}
              {expanded === order._id && (
                <div className="border-t border-gray-100 p-5 space-y-5">
                  {/* Live tracker */}
                  <OrderStatusTracker order={order} socket={socket} />

                  {/* Items */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Items
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {order.orderItems?.map((item) => (
                        <li
                          key={item._id}
                          className="flex items-center gap-3 text-sm"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            onError={(e) => {
                              e.target.src =
                                "https://via.placeholder.com/40?text=?";
                            }}
                          />
                          <span className="flex-1 text-gray-700">{item.name}</span>
                          <span className="text-gray-400">x{item.quantity}</span>
                          <span className="font-semibold text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Delivery address */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Delivery To
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.shippingAddress?.street},{" "}
                      {order.shippingAddress?.city},{" "}
                      {order.shippingAddress?.zip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
