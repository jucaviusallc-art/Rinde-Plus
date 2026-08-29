import React, { useEffect, useState } from "react";
import {
  History,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Trash2,
} from "lucide-react";

import { HistoryRecord, Currency, SnapshotItem } from "../types";

interface HistoryScreenProps {
  history: HistoryRecord[];
  onDeleteHistoryItem: (id: number) => Promise<void>;
  onClearHistory: () => Promise<void>;
}

/**
 * Convierte cualquier valor a número seguro.
 */
function toNumber(value: unknown, fallback = 0): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/**
 * Normaliza la moneda.
 *
 * Todo lo que no sea EUR se considera USD para mantener
 * compatibilidad con registros antiguos.
 */
function normalizeCurrency(value: unknown): Currency {
  return value === "EUR" ? "EUR" : "USD";
}

/**
 * Símbolo de moneda.
 */
function currencySymbol(currency: Currency): string {
  return currency === "EUR" ? "€" : "$";
}

/**
 * Formato de bolívares.
 */
function formatBs(value: unknown): string {
  return toNumber(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formato de moneda extranjera.
 */
function formatCurrency(value: unknown): string {
  return toNumber(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Obtiene la tasa REAL utilizada por un producto.
 */
function getItemRate(
  item: SnapshotItem,
  record: HistoryRecord
): number {
  const storedRate = toNumber(item.rate_used, 0);

  if (storedRate > 0) {
    return storedRate;
  }

  const priceCurrency = toNumber(item.price_usd, 0);
  const priceBs = toNumber(item.price_bs, 0);

  if (priceCurrency > 0 && priceBs > 0) {
    const calculatedRate = priceBs / priceCurrency;

    if (Number.isFinite(calculatedRate) && calculatedRate > 0) {
      return calculatedRate;
    }
  }

  return toNumber(record.rate_used, 0);
}

/**
 * Obtiene las tasas utilizadas agrupadas por moneda.
 */
function getRatesByCurrency(
  record: HistoryRecord
): Partial<Record<Currency, number>> {
  const rates: Partial<Record<Currency, number>> = {};

  for (const item of record.items || []) {
    const currency = normalizeCurrency(item.currency);
    const rate = getItemRate(item, record);

    if (rate > 0) {
      rates[currency] = rate;
    }
  }

  return rates;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
  onDeleteHistoryItem,
  onClearHistory,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(
    history.length > 0 ? history[0].id : null
  );

  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Si cambia el historial y el registro expandido ya no existe,
   * seleccionamos el primero disponible.
   */
  useEffect(() => {
    if (history.length === 0) {
      setExpandedId(null);
      return;
    }

    const exists = history.some(
      (record) => record.id === expandedId
    );

    if (!exists) {
      setExpandedId(history[0].id);
    }
  }, [history, expandedId]);

  const toggleExpand = (id: number) => {
    setExpandedId((current) =>
      current === id ? null : id
    );
  };

  const handleDeleteOne = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que se expanda/colapse la tarjeta al hacer clic en borrar
    if (!window.confirm("¿Estás seguro de que deseas eliminar este registro del historial?")) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDeleteHistoryItem(id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar TODO el historial de compras? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setIsDeleting(true);
      await onClearHistory();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* ============================================================
          ENCABEZADO
         ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-7 h-7 text-[#2E7D32]" />
            Historial de Compras
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registro histórico de tus compras finalizadas con la tasa
            aplicada en cada producto
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vaciar Historial</span>
          </button>
        )}
      </div>

      {/* ============================================================
          SIN HISTORIAL
         ============================================================ */}
      {history.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No tienes compras registradas aún
          </h3>

          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            Cuando completes una compra desde tu carrito,
            aparecerá detallada aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const isExpanded = expandedId === record.id;

            const items = Array.isArray(record.items)
              ? record.items
              : [];

            const rawDate = record.date || record.created_at;
            const dateObj = new Date(rawDate);
            const validDate = !Number.isNaN(dateObj.getTime());

            const dateFormatted = validDate
              ? dateObj.toLocaleDateString("es-VE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Fecha no disponible";

            const timeFormatted = validDate
              ? dateObj.toLocaleTimeString("es-VE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--";

            const currencies = Array.from(
              new Set(
                items.map((item) =>
                  normalizeCurrency(item.currency)
                )
              )
            ) as Currency[];

            const primaryCurrency =
              currencies.length === 1 ? currencies[0] : "USD";
            const primarySymbol = currencySymbol(primaryCurrency);

            const ratesByCurrency = getRatesByCurrency(record);
            const usdRate = ratesByCurrency.USD || 0;
            const eurRate = ratesByCurrency.EUR || 0;
            const hasUSD = usdRate > 0;
            const hasEUR = eurRate > 0;

            const totalBs = toNumber(record.total_bs);
            const totalCurrency = toNumber(record.total_usd);

            return (
              <div
                key={record.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs transition-all"
              >
                {/* ==================================================
                    HEADER DEL REGISTRO
                   ================================================== */}

                <div
                  onClick={() => toggleExpand(record.id)}
                  className="p-5 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  id={`history-header-${record.id}`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-3 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-2xl shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateFormatted}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {timeFormatted}
                        </span>
                      </div>

                      <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                        Bs {formatBs(totalBs)}
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-2">
                          ({primarySymbol}
                          {formatCurrency(totalCurrency)} {primaryCurrency})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Tasas aplicadas
                      </div>

                      <div className="text-xs font-bold text-[#2E7D32] dark:text-emerald-400 flex items-center justify-end gap-2 flex-wrap">
                        <TrendingUp className="w-3 h-3" />
                        {hasUSD && <span>USD: Bs {formatBs(usdRate)}</span>}
                        {hasEUR && <span>EUR: Bs {formatBs(eurRate)}</span>}
                        {!hasUSD && !hasEUR && (
                          <span>Bs {formatBs(record.rate_used)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOne(record.id, e)}
                        disabled={isDeleting}
                        title="Eliminar este registro"
                        className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 text-slate-500 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    DETALLES
                   ================================================== */}

                {isExpanded && (
                  <div className="p-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        <span className="text-slate-400 block">
                          Presupuesto inicial:
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          Bs {formatBs(record.budget_bs)}
                        </strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block">
                          Sobrante al finalizar:
                        </span>
                        <strong className="text-[#2E7D32] dark:text-emerald-400">
                          Bs {formatBs(record.remaining_bs)}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Productos Comprados ({items.length})
                      </h5>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 divide-y divide-slate-100 dark:divide-slate-700/50">
                        {items.map((item, idx) => {
                          const currency = normalizeCurrency(item.currency);
                          const symbol = currencySymbol(currency);
                          const rate = getItemRate(item, record);
                          const priceCurrency = toNumber(item.price_usd);
                          const priceBs = toNumber(item.price_bs);
                          const subtotalBs = toNumber(item.subtotal_bs);
                          const subtotalCurrency = toNumber(item.subtotal_usd);

                          return (
                            <div
                              key={`${record.id}-${item.name}-${idx}`}
                              className="p-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  {item.name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                                  {item.quantity} ud × {symbol}
                                  {formatCurrency(priceCurrency)} {currency}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                                  Bs {formatBs(priceBs)} / ud
                                </span>
                                <span className="text-xs text-[#2E7D32] dark:text-emerald-400 block mt-0.5 font-semibold">
                                  Tasa {currency}: Bs {formatBs(rate)}
                                </span>
                              </div>

                              <div className="text-right font-bold text-slate-900 dark:text-white">
                                Bs {formatBs(subtotalBs)}
                                <span className="block text-xs text-slate-400 font-normal">
                                  {symbol}
                                  {formatCurrency(subtotalCurrency)} {currency}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryScreen;