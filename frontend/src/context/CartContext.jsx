/**
 * context/CartContext.jsx
 * Cart state persisted to localStorage.
 */

import { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext(null);

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const exists = state.items.find((i) => i._id === action.payload._id);
      const items = exists
        ? state.items.map((i) =>
            i._id === action.payload._id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...state.items, { ...action.payload, quantity: 1 }];
      return { ...state, items };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i._id !== action.payload),
      };
    case "UPDATE_QTY": {
      if (action.payload.qty < 1) {
        return {
          ...state,
          items: state.items.filter((i) => i._id !== action.payload.id),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i._id === action.payload.id ? { ...i, quantity: action.payload.qty } : i
        ),
      };
    }
    case "CLEAR":
      return { ...state, items: [] };
    case "SET_ADDRESS":
      return { ...state, shippingAddress: action.payload };
    case "SET_PAYMENT":
      return { ...state, paymentMethod: action.payload };
    default:
      return state;
  }
};

const initialState = () => {
  try {
    const stored = localStorage.getItem("cart");
    return stored
      ? JSON.parse(stored)
      : { items: [], shippingAddress: {}, paymentMethod: "card" };
  } catch {
    return { items: [], shippingAddress: {}, paymentMethod: "card" };
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, undefined, initialState);

  // Sync to localStorage on every change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(state));
  }, [state]);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ ...state, itemCount, subtotal, dispatch }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
