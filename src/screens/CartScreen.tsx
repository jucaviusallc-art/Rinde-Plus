import React, { useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { Budget, CartSummary, ScreenName } from "../types";

interface CartScreenProps {
  budget: Budget | null;
  cartSummary: CartSummary | null;
  onUpdateQuantity: (id: number, quantity: number) => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
  onCheckout: () => Promise<void>;
  onNavigate: (screen: ScreenName) => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  budget,
  cartSummary,
  onUpdateQuantity,
  onDeleteItem,
  onCheckout,
  onNavigate,
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const items = cartSummary?.items || [];
  const totalBs = cartSummary?.total_bs || 0;
  const totalUsd = cartSummary?.total_usd || 0;
  const activeRate = budget?.active_rate || cartSummary?.active_rate || 72.5;

  const montoBs = budget?.monto_bs || 0;
  const remainingBs = Math.max(0, montoBs - totalBs);
  const remainingUsd = activeRate > 0 ? remainingBs / activeRate : 0;

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setErrorMsg(null);
    try {
      setIsCheckingOut(true);
      await onCheckout();
      onNavigate("historial");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al finalizar la compra.");
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-[#2E7D32]" />
            Carrito de Compras
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {items.length} {items.length === 1 ? "producto" : "productos"} en tu lista activa
          </p>
        </div>

        <button
          onClick={() => onNavigate("agregar")}
          id="btn-cart-add-more"
          className="px-4 py-2 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar más</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Resumen Grande Arriba: "Total de compra" (Bs) y "Te quedan" (Bs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total de Compra */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total de Compra
          </span>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
              Bs {totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-slate-400 text-sm font-medium mt-1">
              ≈ ${totalUsd.toFixed(2)} USD
            </div>
          </div>
        </div>

        {/* Te Quedan */}
        <div
          className={`rounded-3xl p-6 shadow-sm border flex flex-col justify-between transition-colors ${
            remainingBs < 0
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
              : "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Te Quedan
          </span>
          <div className="mt-3">
            <div
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                remainingBs < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-[#2E7D32] dark:text-emerald-400"
              }`}
            >
              Bs {remainingBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
              ≈ ${remainingUsd.toFixed(2)} USD
            </div>
          </div>
        </div>
      </div>

      {/* Cart Items List */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Tu carrito está vacío
            </h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Comienza a agregar productos con su precio en USD para llevar el control de tu presupuesto.
            </p>
          </div>
          <button
            onClick={() => onNavigate("agregar")}
            id="btn-empty-cart-add"
            className="px-6 py-3 bg-[#2E7D32] text-white font-bold text-sm rounded-2xl shadow-sm hover:bg-emerald-800 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar primer producto</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const rate = item.rate_used || activeRate;
              const unitBs = item.price_usd * rate;

              return (
                <div
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Item Details */}
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      {item.name}
                    </h4>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>${item.price_usd.toFixed(2)} USD / ud</span>
                      <span>•</span>
                      <span>Bs {unitBs.toFixed(2)} / ud</span>
                    </div>
                  </div>

                  {/* Quantity Controls & Subtotal */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    {/* + / - Controls */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.id, item.quantity - 1)
                        }
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center"
                        title="Disminuir"
                        id={`btn-cart-decrease-${item.id}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-bold text-sm text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.id, item.quantity + 1)
                        }
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center"
                        title="Aumentar"
                        id={`btn-cart-increase-${item.id}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[100px]">
                      <div className="font-extrabold text-slate-900 dark:text-white text-base">
                        Bs {item.subtotal_bs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        ${item.subtotal_usd.toFixed(2)} USD
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                      title="Eliminar producto"
                      id={`btn-cart-delete-${item.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Subtotal Summary & Checkout */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold">
              <span>Subtotal USD acumulado:</span>
              <span className="text-slate-900 dark:text-white font-black text-lg">
                ${totalUsd.toFixed(2)} USD
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || items.length === 0}
              id="btn-finalizar-compra"
              className="w-full py-4 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isCheckingOut ? (
                <span>Procesando checkout...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Finalizar compra (Guardar en Historial)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
