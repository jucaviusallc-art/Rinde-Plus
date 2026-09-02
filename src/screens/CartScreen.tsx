import React, { useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";

import {
  Budget,
  CartSummary,
  ScreenName,
  Currency,
} from "../types";

interface CartScreenProps {
  budget: Budget | null;
  cartSummary: CartSummary | null;
  monedaSeleccionada: Currency;
  selectedRate: number;
  onUpdateQuantity: (
    id: number,
    quantity: number
  ) => Promise<void>;
  onDeleteItem: (
    id: number
  ) => Promise<void>;
  onCheckout: () => Promise<void>;
  onNavigate: (
    screen: ScreenName
  ) => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  budget,
  cartSummary,
  monedaSeleccionada,
  selectedRate,
  onUpdateQuantity,
  onDeleteItem,
  onCheckout,
  onNavigate,
}) => {
  const [isCheckingOut, setIsCheckingOut] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const items =
    cartSummary?.items || [];

  // ============================================================
  // TASA DE LA MONEDA ACTUALMENTE SELECCIONADA
  // ============================================================

  const activeRate =
    Number.isFinite(selectedRate) &&
    selectedRate > 0
      ? selectedRate
      : 0;

  // ============================================================
  // TOTAL REAL DEL CARRITO EN BOLÍVARES
  // ============================================================

  const totalBs = items.reduce((sum, item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const itemRate =
      Number(item.rate_used) > 0
        ? Number(item.rate_used)
        : activeRate;

    const priceBs =
      Number(item.price_bs) > 0
        ? Number(item.price_bs)
        : Number(item.price_usd) > 0 && itemRate > 0
          ? Number(item.price_usd) * itemRate
          : 0;

    const subtotalBs =
      Number(item.subtotal_bs) > 0
        ? Number(item.subtotal_bs)
        : priceBs * quantity;

    return sum + subtotalBs;
  }, 0);

  const currencySymbol =
    monedaSeleccionada === "EUR"
      ? "€"
      : "$";

  const currencyLabel =
    monedaSeleccionada === "EUR"
      ? "EUR"
      : "USD";

  // ============================================================
  // TOTAL EXPRESADO EN LA MONEDA SELECCIONADA
  // ============================================================

  const totalSelectedCurrency =
    activeRate > 0
      ? totalBs / activeRate
      : 0;

  // ============================================================
  // PRESUPUESTO (Coherente con server.ts: monto - spent - cart)
  // ============================================================

  const montoBs = Number(budget?.monto_bs || 0);
  const spentBs = Number(budget?.spent_bs || 0);
  
  // Cálculo exacto igual al backend
  const remainingBs = montoBs - spentBs - totalBs;

  const remainingSelectedCurrency =
    activeRate > 0
      ? remainingBs / activeRate
      : 0;

  // ============================================================
  // FINALIZAR COMPRA
  // ============================================================

  const handleCheckout =
    async () => {
      if (items.length === 0) {
        return;
      }

      setErrorMsg(null);

      try {
        setIsCheckingOut(true);

        await onCheckout();

        onNavigate("historial");
      } catch (err: any) {
        console.error(
          "Error al finalizar compra:",
          err
        );

        setErrorMsg(
          err?.message ||
            "Error al finalizar la compra."
        );

        setIsCheckingOut(false);
      }
    };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="max-w-4xl mx-auto space-y-3 py-1">

      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-[#2E7D32]" />
            Carrito de Compras
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {items.length}{" "}
            {items.length === 1
              ? "producto"
              : "productos"}{" "}
            en tu lista activa
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onNavigate("agregar")
          }
          id="btn-cart-add-more"
          className="w-full sm:w-auto px-4 py-2.5 bg-[#2E7D32] dark:bg-emerald-700 text-white hover:bg-emerald-800 dark:hover:bg-emerald-600 font-bold text-sm sm:text-base rounded-2xl shadow-md shadow-emerald-900/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-emerald-700 dark:border-emerald-600"
        >
          <Plus className="w-5 h-5" />
          <span>
            Agregar más productos
          </span>
        </button>
      </div>

      {/* INFORMACIÓN DE LA TASA */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Moneda de referencia
        </span>

        <span className="font-black text-[#2E7D32] dark:text-emerald-400">
          {currencyLabel}
        </span>

        <span className="text-sm text-slate-500 dark:text-slate-400">
          Tasa:{" "}
          <strong className="text-slate-800 dark:text-white">
            Bs{" "}
            {activeRate > 0
              ? activeRate.toFixed(2)
              : "—"}
          </strong>
        </span>
      </div>

      {/* ERROR */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* RESUMEN COMPACTO */}
      <div className="flex flex-col gap-2">
        {/* TOTAL DE COMPRA */}
        <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total de Compra
            </span>

            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight leading-none">
                Bs{" "}
                {totalBs.toLocaleString(
                  "es-VE",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </div>

              <div className="text-slate-400 text-[11px] font-medium mt-1">
                ≈ {currencySymbol}
                {totalSelectedCurrency.toFixed(
                  2
                )}{" "}
                {currencyLabel}
              </div>
            </div>
          </div>
        </div>

        {/* TE QUEDAN */}
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm border transition-colors ${
            remainingBs < 0
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
              : "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Te Quedan
            </span>

            <div className="text-right">
              <div
                className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${
                  remainingBs < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-[#2E7D32] dark:text-emerald-400"
                }`}
              >
                Bs{" "}
                {remainingBs.toLocaleString(
                  "es-VE",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </div>

              <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium mt-1">
                ≈ {currencySymbol}
                {remainingSelectedCurrency.toFixed(
                  2
                )}{" "}
                {currencyLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARRITO VACÍO */}
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
              Comienza a agregar productos con su
              precio en {currencyLabel} para llevar
              el control de tu presupuesto.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onNavigate("agregar")
            }
            id="btn-empty-cart-add"
            className="px-6 py-3 bg-[#2E7D32] text-white font-bold text-sm rounded-2xl shadow-sm hover:bg-emerald-800 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>
              Agregar primer producto
            </span>
          </button>
        </div>
      ) : (
        /* LISTA DE PRODUCTOS */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const itemCurrency: Currency =
                item.currency === "EUR"
                  ? "EUR"
                  : "USD";

              const itemSymbol =
                itemCurrency === "EUR"
                  ? "€"
                  : "$";

              const itemCurrencyLabel =
                itemCurrency;

              const itemRate =
                Number(item.rate_used) > 0
                  ? Number(item.rate_used)
                  : activeRate;

              const unitBs =
                Number(item.price_bs) > 0
                  ? Number(item.price_bs)
                  : Number(item.price_usd) > 0 &&
                      itemRate > 0
                    ? Number(item.price_usd) * itemRate
                    : 0;

              const subtotalBs =
                Number(item.subtotal_bs) > 0
                  ? Number(item.subtotal_bs)
                  : unitBs *
                    Math.max(
                      1,
                      Number(item.quantity) || 1
                    );

              const unitCurrencyPrice =
                Number(
                  item.price_usd || 0
                );

              const subtotalCurrency =
                Number(item.subtotal_usd) > 0
                  ? Number(item.subtotal_usd)
                  : unitCurrencyPrice *
                    Math.max(
                      1,
                      Number(item.quantity) || 1
                    );

              return (
                <div
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* DETALLES */}
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      {item.name}
                    </h4>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        {itemSymbol}
                        {unitCurrencyPrice.toFixed(
                          2
                        )}{" "}
                        {itemCurrencyLabel} / ud
                      </span>

                      <span>•</span>

                      <span>
                        Bs{" "}
                        {unitBs.toLocaleString(
                          "es-VE",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}{" "}
                        / ud
                      </span>

                      {itemRate > 0 && (
                        <>
                          <span>•</span>

                          <span className="font-semibold">
                            Tasa{" "}
                            {itemCurrencyLabel}:{" "}
                            Bs{" "}
                            {itemRate.toFixed(
                              2
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* CANTIDAD + SUBTOTAL */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    {/* CONTROLES (Math.max simplificado) */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(
                            item.id,
                            Math.max(1, Number(item.quantity) - 1)
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center disabled:opacity-40"
                        title="Disminuir"
                        id={`btn-cart-decrease-${item.id}`}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-10 text-center font-bold text-sm text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(
                            item.id,
                            Number(item.quantity) + 1
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center"
                        title="Aumentar"
                        id={`btn-cart-increase-${item.id}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* SUBTOTAL */}
                    <div className="text-right min-w-[110px]">
                      <div className="font-extrabold text-slate-900 dark:text-white text-base">
                        Bs{" "}
                        {subtotalBs.toLocaleString(
                          "es-VE",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {itemSymbol}
                        {subtotalCurrency.toFixed(
                          2
                        )}{" "}
                        {itemCurrencyLabel}
                      </div>
                    </div>

                    {/* ELIMINAR */}
                    <button
                      type="button"
                      onClick={() =>
                        onDeleteItem(
                          item.id
                        )
                      }
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

          {/* RESUMEN FINAL */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold">
              <span>
                Total acumulado ({currencyLabel}):
              </span>

              <span className="text-slate-900 dark:text-white font-black text-lg">
                {currencySymbol}
                {totalSelectedCurrency.toFixed(
                  2
                )}{" "}
                {currencyLabel}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold">
              <span>
                Total en bolívares:
              </span>

              <span className="text-slate-900 dark:text-white font-black text-lg">
                Bs{" "}
                {totalBs.toLocaleString(
                  "es-VE",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </span>
            </div>

            {/* FINALIZAR COMPRA */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={
                isCheckingOut ||
                items.length === 0
              }
              id="btn-finalizar-compra"
              className="w-full py-4 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isCheckingOut ? (
                <span>
                  Procesando checkout...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />

                  <span>
                    Finalizar Compra
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};