import React, { useState } from "react";
import {
  PlusCircle,
  DollarSign,
  Package,
  ShoppingCart,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Budget, ScreenName } from "../types";

interface AddProductScreenProps {
  budget: Budget | null;
  onAddToCart: (
    name: string,
    price_usd: number,
    quantity: number
  ) => Promise<void>;
  onNavigate: (screen: ScreenName) => void;
}

export const AddProductScreen: React.FC<AddProductScreenProps> = ({
  budget,
  onAddToCart,
  onNavigate,
}) => {
  const [name, setName] = useState("");
  const [priceUsdStr, setPriceUsdStr] = useState("");
  const [quantityStr, setQuantityStr] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeRate = budget?.active_rate || 72.5;
  const parsedPriceUsd = parseFloat(priceUsdStr) || 0;
  const parsedQty = parseInt(quantityStr) || 1;

  const unitPriceBs = parsedPriceUsd * activeRate;
  const totalSubtotalUsd = parsedPriceUsd * parsedQty;
  const totalSubtotalBs = unitPriceBs * parsedQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Ingresa el nombre del producto.");
      return;
    }

    if (parsedPriceUsd <= 0) {
      setErrorMsg("Ingresa un precio en dólares mayor a cero.");
      return;
    }

    if (parsedQty <= 0) {
      setErrorMsg("La cantidad debe ser al menos 1.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddToCart(name.trim(), parsedPriceUsd, parsedQty);
      // As requested in UX flow rule: "Agregar producto -> vuelve a Control de Compra (no al carrito)"
      onNavigate("dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al agregar el producto.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      {/* Back to Control de Compra link */}
      <button
        onClick={() => onNavigate("dashboard")}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        id="btn-back-to-dashboard"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Control de Compra</span>
      </button>

      {/* Main Form Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-2xl">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Agregar Producto
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ingresa el precio en dólares para convertir automáticamente a Bs
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre del Producto */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Nombre del Producto
            </label>
            <div className="relative">
              <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Ej: Harina Pan, Queso Blanco, Leche 1L..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                id="input-product-name"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Precio en USD */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Precio en Dólares ($ USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={priceUsdStr}
                  onChange={(e) => setPriceUsdStr(e.target.value)}
                  required
                  id="input-product-price-usd"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                />
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Cantidad
              </label>
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() =>
                    setQuantityStr(Math.max(1, parsedQty - 1).toString())
                  }
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-lg shadow-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantityStr}
                  onChange={(e) => setQuantityStr(e.target.value)}
                  id="input-product-qty"
                  className="w-full text-center font-bold text-slate-900 dark:text-white bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantityStr((parsedQty + 1).toString())}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-lg shadow-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Automatic Live Conversion Preview Box */}
          <div className="p-5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-[#2E7D32] dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" /> Conversión Automática en Bolívares
              </span>
              <span>
                Tasa Usada: <strong>Bs {activeRate.toFixed(2)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  Precio unitario:
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  Bs {unitPriceBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  Subtotal ({parsedQty} ud):
                </span>
                <span className="text-xl font-black text-[#2E7D32] dark:text-emerald-400">
                  Bs {totalSubtotalBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  ($ {totalSubtotalUsd.toFixed(2)} USD)
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-agregar-al-carrito"
            className="w-full py-4 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Procesando...</span>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                <span>Agregar al carrito</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
