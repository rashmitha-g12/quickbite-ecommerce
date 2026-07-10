/**
 * components/orders/OrderStatusTracker.jsx
 * Visual stepper + live Socket.IO updates for a single order.
 */

import { useEffect, useState } from "react";
import { CheckCircle, Circle, Clock, Truck, ChefHat, Package } from "lucide-react";
import { toast } from "react-toastify";

const STEPS = [
  { key: "pending",           label: "Order Placed",     Icon: Clock },
  { key: "confirmed",         label: "Confirmed",        Icon: CheckCircle },
  { key: "preparing",         label: "Preparing",        Icon: ChefHat },
  { key: "out_for_delivery",  label: "Out for Delivery", Icon: Truck },
  { key: "delivered",         label: "Delivered",        Icon: Package },
];

const stepIndex = (status) => STEPS.findIndex((s) => s.key === status);

const OrderStatusTracker = ({ order, socket }) => {
  const [currentStatus, setCurrentStatus] = useState(order?.status || "pending");

  // Listen for real-time status changes
  useEffect(() => {
    if (!socket || !order?._id) return;

    socket.emit("join_order", order._id);

    const handler = ({ orderId, status, note }) => {
      if (orderId === order._id) {
        setCurrentStatus(status);
        toast.info(`Order update: ${status.replace(/_/g, " ")}${note ? ` — ${note}` : ""}`, {
          position: "top-right",
        });
      }
    };

    socket.on("order_updated", handler);
    return () => {
      socket.off("order_updated", handler);
      socket.emit("leave_order", order._id);
    };
  }, [socket, order?._id]);

  // Sync when order prop changes (initial load)
  useEffect(() => {
    if (order?.status) setCurrentStatus(order.status);
  }, [order?.status]);

  const current = stepIndex(currentStatus);
  const isCancelled = currentStatus === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-100 rounded-xl p-4">
        <span className="font-semibold">Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const { Icon } = step;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    done
                      ? "bg-green-500 text-white"
                      : active
                      ? "bg-brand-500 text-white animate-pulse-slow"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-medium text-center leading-tight hidden sm:block ${
                    done || active ? "text-gray-800" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors ${
                    i < current ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile labels */}
      <p className="mt-3 text-sm font-semibold text-brand-500 sm:hidden capitalize">
        {currentStatus.replace(/_/g, " ")}
      </p>
    </div>
  );
};

export default OrderStatusTracker;
