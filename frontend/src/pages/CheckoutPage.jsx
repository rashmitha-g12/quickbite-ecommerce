/**
 * pages/CheckoutPage.jsx
 * Shows cart contents, collects shipping address, and places the order.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CreditCard, ChevronRight } from "lucide-react";
import CartSidebar from "../components/cart/CartSidebar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { orderAPI } from "../api/services";
import { toast } from "react-toastify";

const PAYMENT_METHODS = [
  { id: "card",   label: "Credit / Debit Card", emoji: "💳" },
  { id: "upi",    label: "UPI",                 emoji: "📱" },
  { id: "cash",   label: "Cash on Delivery",    emoji: "💵" },
  { id: "wallet", label: "Wallet",              emoji: "👛" },
];

const CheckoutPage = () => {
  const { items, subtotal, dispatch } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState({
    street: "", city: "", state: "", zip: "", country: "US",
  });
  const [payment, setPayment] = useState("card");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const tax = +(subtotal * 0.1).toFixed(2);
  const shipping = subtotal > 50 ? 0 : 4.99;
  const total = +(subtotal + tax + shipping).toFixed(2);

  const validate = () => {
    const e = {};
    if (!address.street.trim()) e.street = "Street required";
    if (!address.city.trim()) e.city = "City required";
    if (!address.zip.trim()) e.zip = "ZIP required";
    return e;
  };

  const handlePlaceOrder = async () => {
    if (!isLoggedIn) return navigate("/login", { state: { from: { pathname: "/checkout" } } });
    if (items.length === 0) return toast.warning("Your cart is empty");

    const e = validate();
    if (Object.keys(e).length) return setErrors(e);

    setLoading(true);
    try {
      const orderPayload = {
        orderItems: items.map((i) => ({
          product: i._id,
          quantity: i.quantity,
        })),
        shippingAddress: address,
        paymentMethod: payment,
      };

      const { data } = await orderAPI.create(orderPayload);
      dispatch({ type: "CLEAR" });
      toast.success("Order placed successfully! 🎉");
      navigate(`/orders/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    value: address[key],
    onChange: (e) => {
      setAddress((a) => ({ ...a, [key]: e.target.value }));
      if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Address + Payment */}
          <div className="lg:col-span-2 space-y-5">
            {/* Shipping address */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-500" />
                Delivery Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "street", label: "Street Address", full: true },
                  { key: "city",   label: "City" },
                  { key: "state",  label: "State / Province" },
                  { key: "zip",    label: "ZIP / Postal Code" },
                  { key: "country", label: "Country" },
                ].map(({ key, label, full }) => (
                  <div key={key} className={full ? "sm:col-span-2" : ""}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      {...field(key)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                        errors[key] ? "border-red-400" : "border-gray-200"
                      }`}
                    />
                    {errors[key] && (
                      <p className="text-xs text-red-500 mt-0.5">{errors[key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-500" />
                Payment Method
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPayment(m.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      payment === m.id
                        ? "border-brand-500 bg-brand-50 text-brand-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4">Order Summary</h2>
              <CartSidebar />
            </div>

            {items.length > 0 && (
              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-brand-500/20"
              >
                {loading ? "Placing Order…" : (
                  <>
                    Place Order — ${total.toFixed(2)}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
