/**
 * components/cart/CartSidebar.jsx
 * Slide-out cart shown on the Checkout page.
 */

import { Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "../../context/CartContext";

const CartSidebar = () => {
  const { items, subtotal, dispatch } = useCart();

  const tax = +(subtotal * 0.1).toFixed(2);
  const shipping = subtotal > 50 ? 0 : 4.99;
  const total = +(subtotal + tax + shipping).toFixed(2);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <span className="text-5xl">🛒</span>
        <p className="font-medium">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Items */}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item._id} className="flex items-center gap-3">
            <img
              src={item.image}
              alt={item.name}
              className="w-14 h-14 rounded-xl object-cover bg-gray-100 flex-shrink-0"
              onError={(e) => { e.target.src = "https://via.placeholder.com/56?text=?"; }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">${item.price.toFixed(2)} each</p>
            </div>
            {/* Qty controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  dispatch({ type: "UPDATE_QTY", payload: { id: item._id, qty: item.quantity - 1 } })
                }
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() =>
                  dispatch({ type: "UPDATE_QTY", payload: { id: item._id, qty: item.quantity + 1 } })
                }
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {/* Line total */}
            <span className="text-sm font-bold text-gray-800 w-14 text-right">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
            <button
              onClick={() => dispatch({ type: "REMOVE_ITEM", payload: item._id })}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      {/* Totals */}
      <div className="border-t border-gray-100 pt-4 flex flex-col gap-1.5 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (10%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{shipping === 0 ? <span className="text-green-500">Free</span> : `$${shipping}`}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default CartSidebar;
