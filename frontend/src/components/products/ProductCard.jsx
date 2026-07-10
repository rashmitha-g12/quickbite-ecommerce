/**
 * components/products/ProductCard.jsx
 */

import { ShoppingCart, Star, Clock } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { toast } from "react-toastify";

const ProductCard = ({ product }) => {
  const { dispatch } = useCart();

  const handleAdd = () => {
    if (product.countInStock === 0) return;
    dispatch({ type: "ADD_ITEM", payload: product });
    toast.success(`${product.name} added to cart`, {
      position: "bottom-right",
      autoClose: 1500,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-50">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/400x300?text=No+Image";
          }}
        />
        {product.countInStock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm bg-red-500 px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
        {/* Category badge */}
        <span className="absolute top-2 left-2 bg-white/90 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
          {product.category}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{product.description}</p>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          {product.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {product.rating.toFixed(1)}
            </span>
          )}
          {product.prepTime && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {product.prepTime} min
            </span>
          )}
        </div>

        {/* Price + Add to cart */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            disabled={product.countInStock === 0}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
