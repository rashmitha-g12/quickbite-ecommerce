/**
 * pages/HomePage.jsx
 * Product listing with keyword search + category filter.
 */

import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import ProductCard from "../components/products/ProductCard";
import { productAPI } from "../api/services";

const CATEGORIES = ["all", "food", "drink", "dessert", "electronics", "clothing", "other"];

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="h-44 bg-gray-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
      <div className="flex justify-between mt-3">
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-8 bg-gray-200 rounded w-16" />
      </div>
    </div>
  </div>
);

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12 };
      if (keyword) params.keyword = keyword;
      if (category !== "all") params.category = category;

      const { data } = await productAPI.getAll(params);
      setProducts(data.products);
      setPages(data.pages);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [keyword, category, page]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [keyword, category]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-brand-500 to-orange-600 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Fast Delivery, Fresh Food 🍕
          </h1>
          <p className="text-orange-100 mb-6">Order in minutes, delivered to your door.</p>

          {/* Search bar */}
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for dishes…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                category === cat
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-brand-500"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center py-16 text-red-500">
            <p className="font-medium">{error}</p>
            <button
              onClick={fetchProducts}
              className="mt-3 text-sm underline text-gray-500"
            >
              Try again
            </button>
          </div>
        )}

        {/* Product grid */}
        {!error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                : products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>

            {!loading && products.length === 0 && (
              <div className="text-center py-24 text-gray-400">
                <p className="text-5xl mb-3">🔍</p>
                <p className="font-medium">No products found. Try a different search.</p>
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      p === page
                        ? "bg-brand-500 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-brand-500"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
