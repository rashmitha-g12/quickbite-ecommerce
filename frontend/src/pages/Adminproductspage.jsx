/**
 * pages/AdminProductsPage.jsx
 * Full product management — add, edit, delete, toggle availability.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus, Pencil, Trash2, X, Save, Search,
    Package, AlertCircle, CheckCircle, Image,
} from "lucide-react";
import { productAPI } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const CATEGORIES = ["food", "drink", "dessert", "electronics", "clothing", "other"];

const EMPTY_FORM = {
    name: "",
    description: "",
    price: "",
    category: "food",
    image: "",
    countInStock: "",
    prepTime: "",
    isAvailable: true,
};

// ── Small reusable field ──────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {label}
        </label>
        {children}
        {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
            </p>
        )}
    </div>
);

const Input = ({ className = "", ...props }) => (
    <input
        className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm
      focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
      hover:border-gray-300 transition-all placeholder:text-gray-300 ${className}`}
        {...props}
    />
);

// ── Product Form Modal ────────────────────────────────────────────────────────
const ProductModal = ({ product, onClose, onSaved }) => {
    const isEdit = !!product?._id;
    const [form, setForm] = useState(
        isEdit
            ? {
                name: product.name,
                description: product.description,
                price: product.price,
                category: product.category,
                image: product.image || "",
                countInStock: product.countInStock,
                prepTime: product.prepTime || "",
                isAvailable: product.isAvailable,
            }
            : EMPTY_FORM
    );
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [imgPreview, setImgPreview] = useState(
        isEdit ? product.image : ""
    );

    const set = (key, val) => {
        setForm((f) => ({ ...f, [key]: val }));
        if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Name is required";
        else if (form.name.trim().length < 3) e.name = "At least 3 characters";
        if (!form.description.trim()) e.description = "Description is required";
        else if (form.description.trim().length < 10) e.description = "At least 10 characters";
        if (!form.price) e.price = "Price is required";
        else if (isNaN(form.price) || Number(form.price) < 0) e.price = "Enter a valid price";
        if (!form.countInStock && form.countInStock !== 0)
            e.countInStock = "Stock quantity is required";
        else if (isNaN(form.countInStock) || Number(form.countInStock) < 0)
            e.countInStock = "Enter a valid quantity";
        if (form.image && !/^https?:\/\/.+/.test(form.image))
            e.image = "Must be a valid URL starting with http:// or https://";
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) return setErrors(errs);

        setSaving(true);
        try {
            const payload = {
                ...form,
                price: Number(form.price),
                countInStock: Number(form.countInStock),
                prepTime: form.prepTime ? Number(form.prepTime) : 0,
            };

            if (isEdit) {
                await productAPI.update(product._id, payload);
                toast.success("Product updated successfully");
            } else {
                await productAPI.create(payload);
                toast.success("Product added successfully 🎉");
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save product");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4 text-brand-500" />
                        </div>
                        <h2 className="font-bold text-gray-900">
                            {isEdit ? "Edit Product" : "Add New Product"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Image preview + URL */}
                    <div className="flex gap-4 items-start">
                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {imgPreview ? (
                                <img
                                    src={imgPreview}
                                    alt="preview"
                                    className="w-full h-full object-cover"
                                    onError={() => setImgPreview("")}
                                />
                            ) : (
                                <Image className="w-8 h-8 text-gray-300" />
                            )}
                        </div>
                        <Field label="Image URL" error={errors.image} className="flex-1">
                            <Input
                                type="url"
                                placeholder="https://images.unsplash.com/..."
                                value={form.image}
                                onChange={(e) => {
                                    set("image", e.target.value);
                                    setImgPreview(e.target.value);
                                }}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Paste any image URL — from Unsplash, your server, etc.
                            </p>
                        </Field>
                    </div>

                    {/* Name */}
                    <Field label="Product Name *" error={errors.name}>
                        <Input
                            type="text"
                            placeholder="e.g. Margherita Pizza"
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                        />
                    </Field>

                    {/* Description */}
                    <Field label="Description *" error={errors.description}>
                        <textarea
                            rows={3}
                            placeholder="Describe the product in detail…"
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                hover:border-gray-300 transition-all placeholder:text-gray-300 resize-none"
                        />
                    </Field>

                    {/* Price + Stock + PrepTime */}
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Price ($) *" error={errors.price}>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="9.99"
                                value={form.price}
                                onChange={(e) => set("price", e.target.value)}
                            />
                        </Field>
                        <Field label="Stock Qty *" error={errors.countInStock}>
                            <Input
                                type="number"
                                min="0"
                                placeholder="50"
                                value={form.countInStock}
                                onChange={(e) => set("countInStock", e.target.value)}
                            />
                        </Field>
                        <Field label="Prep Time (min)">
                            <Input
                                type="number"
                                min="0"
                                placeholder="15"
                                value={form.prepTime}
                                onChange={(e) => set("prepTime", e.target.value)}
                            />
                        </Field>
                    </div>

                    {/* Category + Availability */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Category *">
                            <select
                                value={form.category}
                                onChange={(e) => set("category", e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                  bg-white hover:border-gray-300 transition-all capitalize"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c} className="capitalize">{c}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Availability">
                            <div className="flex items-center gap-3 h-10">
                                <button
                                    type="button"
                                    onClick={() => set("isAvailable", !form.isAvailable)}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isAvailable ? "bg-green-500" : "bg-gray-200"
                                        }`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isAvailable ? "translate-x-5" : "translate-x-0"
                                            }`}
                                    />
                                </button>
                                <span className={`text-sm font-medium ${form.isAvailable ? "text-green-600" : "text-gray-400"
                                    }`}>
                                    {form.isAvailable ? "Available" : "Hidden"}
                                </span>
                            </div>
                        </Field>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold
                text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600
                disabled:bg-gray-300 text-white text-sm font-bold transition-colors
                flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {isEdit ? "Save Changes" : "Add Product"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Delete confirmation ───────────────────────────────────────────────────────
const DeleteModal = ({ product, onClose, onDeleted }) => {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await productAPI.remove(product._id);
            toast.success(`"${product.name}" deleted`);
            onDeleted();
            onClose();
        } catch {
            toast.error("Failed to delete product");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-center">
                    <h3 className="font-bold text-gray-900">Delete Product?</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        <span className="font-semibold">"{product.name}"</span> will be
                        permanently removed. This cannot be undone.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300
              text-white text-sm font-bold transition-colors"
                    >
                        {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminProductsPage = () => {
    const { isAdmin, isLoggedIn } = useAuth();
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("all");
    const [modalProduct, setModalProduct] = useState(undefined); // undefined=closed, null=new, obj=edit
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Redirect non-admins
    useEffect(() => {
        if (!isLoggedIn) navigate("/login");
        else if (!isAdmin) navigate("/");
    }, [isAdmin, isLoggedIn, navigate]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit: 100, showAll: true };
            if (keyword) params.keyword = keyword;
            if (category !== "all") params.category = category;
            const { data } = await productAPI.getAll(params);
            setProducts(data.products || []);
        } catch {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    }, [keyword, category]);

    useEffect(() => {
        const t = setTimeout(fetchProducts, 300);
        return () => clearTimeout(t);
    }, [fetchProducts]);

    const toggleAvailability = async (product) => {
        try {
            await productAPI.update(product._id, { isAvailable: !product.isAvailable });
            setProducts((prev) =>
                prev.map((p) =>
                    p._id === product._id ? { ...p, isAvailable: !p.isAvailable } : p
                )
            );
            toast.success(
                `"${product.name}" ${!product.isAvailable ? "shown" : "hidden"} from menu`
            );
        } catch {
            toast.error("Failed to update availability");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {products.length} product{products.length !== 1 ? "s" : ""} total
                        </p>
                    </div>
                    <button
                        onClick={() => setModalProduct(null)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600
              text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-brand-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Product
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products…"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                        />
                    </div>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white
              focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 capitalize"
                    >
                        <option value="all">All Categories</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c} className="capitalize">{c}</option>
                        ))}
                    </select>
                </div>

                {/* Products grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                                <div className="h-40 bg-gray-200" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-full" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-24 text-gray-400">
                        <Package className="w-16 h-16 mx-auto text-gray-200 mb-3" />
                        <p className="font-semibold">No products found</p>
                        <button
                            onClick={() => setModalProduct(null)}
                            className="mt-3 text-sm text-brand-500 hover:underline font-medium"
                        >
                            Add your first product →
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.map((product) => (
                            <div
                                key={product._id}
                                className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md ${product.isAvailable ? "border-gray-100" : "border-gray-200 opacity-60"
                                    }`}
                            >
                                {/* Image */}
                                <div className="relative h-40 bg-gray-100 overflow-hidden">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = "https://via.placeholder.com/400x300?text=No+Image";
                                        }}
                                    />
                                    {/* Availability badge */}
                                    <div className="absolute top-2 right-2">
                                        <button
                                            onClick={() => toggleAvailability(product)}
                                            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
                        transition-colors ${product.isAvailable
                                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                }`}
                                        >
                                            {product.isAvailable
                                                ? <><CheckCircle className="w-3 h-3" /> Live</>
                                                : <><X className="w-3 h-3" /> Hidden</>
                                            }
                                        </button>
                                    </div>
                                    {/* Category */}
                                    <span className="absolute top-2 left-2 bg-white/90 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
                                        {product.category}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                                        {product.name}
                                    </h3>
                                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                                        {product.description}
                                    </p>

                                    <div className="flex items-center justify-between mt-3">
                                        <div>
                                            <p className="text-lg font-bold text-gray-900">
                                                ${product.price.toFixed(2)}
                                            </p>
                                            <p className={`text-xs font-medium ${product.countInStock === 0
                                                ? "text-red-500"
                                                : product.countInStock < 10
                                                    ? "text-orange-500"
                                                    : "text-gray-400"
                                                }`}>
                                                {product.countInStock === 0
                                                    ? "Out of stock"
                                                    : `${product.countInStock} in stock`}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => setModalProduct(product)}
                                                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500
                          flex items-center justify-center transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(product)}
                                                className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500
                          flex items-center justify-center transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add / Edit modal */}
            {modalProduct !== undefined && (
                <ProductModal
                    product={modalProduct}
                    onClose={() => setModalProduct(undefined)}
                    onSaved={fetchProducts}
                />
            )}

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <DeleteModal
                    product={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={fetchProducts}
                />
            )}
        </div>
    );
};

export default AdminProductsPage;