import React, { useState } from "react";
import {
  PlusCircle,
  ArrowLeft,
  DollarSign,
  Euro,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { Budget, Currency, ScreenName } from "../types";

interface AddProductScreenProps {
  budget: Budget | null;
  monedaSeleccionada: Currency;
  selectedRate: number | null;
  onAddToCart: (
    name: string,
    price: number,
    quantity: number,
    currency: Currency
  ) => Promise<void>;
  onNavigate: (screen: ScreenName) => void;
}

export const AddProductScreen: React.FC<AddProductScreenProps> = ({
  budget,
  monedaSeleccionada,
  selectedRate,
  onAddToCart,
  onNavigate,
}) => {
  const [name, setName] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [quantityStr, setQuantityStr] = useState("1");
  const [currency, setCurrency] = useState<Currency>(monedaSeleccionada);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = currency === "EUR" ? "€" : "$";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Por favor ingrese el nombre del producto.");
      return;
    }

    const price = Number.parseFloat(priceStr);
    if (!Number.isFinite(price) || price <= 0) {
      setErrorMsg("Por favor ingrese un precio válido mayor a cero.");
      return;
    }

    const quantity = Number.parseInt(quantityStr, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMsg("Por favor ingrese una cantidad válida.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddToCart(trimmedName, price, quantity, currency);
      onNavigate("carrito");
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al agregar el producto al carrito.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-2 py-0.5">

      {/* ==================================================
          ENCABEZADO
      ================================================== */}

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-xs flex items-center justify-between">

        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#2E7D32]" />
            Agregar Producto
          </h1>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.2">
            Añade artículos a tu lista de compras
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver</span>
        </button>

      </div>

      {/* ==================================================
          FORMULARIO
      ================================================== */}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* NOMBRE */}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nombre del Producto
            </label>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <ShoppingBag className="w-4 h-4" />
              </span>

              <input
                type="text"
                placeholder="Ej: Harina Pan, Arroz, Café..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                id="input-product-name"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* MONEDA DEL PRODUCTO */}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Moneda del Precio
            </label>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`py-2 px-2 rounded-lg font-bold text-xs transition-all ${
                  currency === "USD"
                    ? "bg-white dark:bg-slate-700 text-[#2E7D32] dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-700/60"
                }`}
              >
                <DollarSign className="inline-block w-3.5 h-3.5 mr-1" />
                Dólar (USD)
              </button>

              <button
                type="button"
                onClick={() => setCurrency("EUR")}
                className={`py-2 px-2 rounded-lg font-bold text-xs transition-all ${
                  currency === "EUR"
                    ? "bg-white dark:bg-slate-700 text-[#2E7D32] dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-700/60"
                }`}
              >
                <Euro className="inline-block w-3.5 h-3.5 mr-1" />
                Euro (EUR)
              </button>
            </div>
          </div>

          {/* PRECIO Y CANTIDAD */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* PRECIO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Precio Unitario ({currencySymbol})
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {currencySymbol}
                </span>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required
                  id="input-product-price"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* CANTIDAD */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cantidad
              </label>

              <input
                type="number"
                step="1"
                min="1"
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                onFocus={(e) => e.target.select()}
                required
                id="input-product-quantity"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent outline-none transition-all"
              />
            </div>

          </div>

          {/* BOTÓN GUARDAR */}

          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-add-product"
            className="w-full py-3 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <span>Guardando...</span>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Agregar al Carrito</span>
              </>
            )}
          </button>

        </form>

      </div>

    </div>
  );
};

export default AddProductScreen;