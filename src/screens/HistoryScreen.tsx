import React, { useState } from "react";
import {
  History,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { HistoryRecord, Currency } from "../types";

interface HistoryScreenProps {
  history: HistoryRecord[];
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(
    history.length > 0 ? history[0].id : null
  );

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <History className="w-7 h-7 text-[#2E7D32]" />
          Historial de Compras
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Registro histórico de tus compras finalizadas con la tasa aplicada
          en cada producto
        </p>
      </div>

      {history.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">

          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No tienes compras registradas aún
          </h3>

          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Cuando completes una compra desde tu carrito, aparecerá detallada
            aquí[cite: 6].
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {history.map((record) => {
            const isExpanded = expandedId === record.id;

            const dateObj = new Date(
              record.date || record.created_at
            );

            const dateFormatted = dateObj.toLocaleDateString(
              "es-VE",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            );

            const timeFormatted = dateObj.toLocaleTimeString(
              "es-VE",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            const currencies = Array.from(
              new Set(
                record.items.map((item) =>
                  item.currency === "EUR" ? "EUR" : "USD"
                )
              )
            ) as Currency[];

            // Determinamos la moneda principal para el encabezado del registro
            const primaryCurrency = currencies.length === 1 ? currencies[0] : "USD";
            const primarySymbol = primaryCurrency === "EUR" ? "€" : "$";

            return (
              <div
                key={record.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs transition-all"
              >

                {/* Header Row */}
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

                        Bs{" "}
                        {record.total_bs.toLocaleString(
                          "es-VE",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}

                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-2">
                          ({primarySymbol}{record.total_usd.toFixed(2)} {primaryCurrency})
                        </span>

                      </div>

                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">

                    <div className="text-right">

                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Tasa Aplicada
                      </div>

                      <div className="text-xs font-bold text-[#2E7D32] dark:text-emerald-400 flex items-center justify-end gap-1">

                        <TrendingUp className="w-3 h-3" />

                        {currencies.length > 0 ? (
                          <>
                            {currencies.map((currency) => (
                              <span key={currency}>
                                {currency}: Bs{" "}
                                {Number(
                                  record.rate_used || 0
                                ).toFixed(2)}
                              </span>
                            ))}
                          </>
                        ) : (
                          <>
                            Bs{" "}
                            {Number(
                              record.rate_used || 0
                            ).toFixed(2)}
                          </>
                        )}

                      </div>

                    </div>

                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}

                    </div>

                  </div>
                </div>

                {/* Detalles */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 space-y-4">

                    {/* Presupuesto */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">

                      <div>
                        <span className="text-slate-400 block">
                          Presupuesto inicial:
                        </span>

                        <strong className="text-slate-900 dark:text-white">
                          Bs{" "}
                          {record.budget_bs.toLocaleString(
                            "es-VE",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block">
                          Sobrante al finalizar:
                        </span>

                        <strong className="text-[#2E7D32] dark:text-emerald-400">
                          Bs{" "}
                          {record.remaining_bs.toLocaleString(
                            "es-VE",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </div>

                    </div>

                    {/* Productos */}
                    <div>

                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Productos Comprados ({record.items.length})
                      </h5>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 divide-y divide-slate-100 dark:divide-slate-700/50">

                        {record.items.map((item, idx) => {
                          const currency: Currency =
                            item.currency === "EUR"
                              ? "EUR"
                              : "USD";

                          const symbol =
                            currency === "EUR"
                              ? "€"
                              : "$";

                          const rate = Number(
                            record.rate_used || 0
                          );

                          const priceCurrency = Number(
                            item.price_usd || 0
                          );

                          const priceBs = Number(
                            item.price_bs || 0
                          );

                          const subtotalBs = Number(
                            item.subtotal_bs || 0
                          );

                          const subtotalCurrency =
                            Number(
                              item.subtotal_usd || 0
                            );

                          return (
                            <div
                              key={idx}
                              className="p-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >

                              <div>

                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  {item.name}
                                </span>

                                <span className="text-xs text-slate-500">
                                  {item.quantity} ud ×{" "}
                                  {symbol}
                                  {priceCurrency.toFixed(2)}{" "}
                                  {currency}
                                </span>

                                <span className="text-xs text-slate-500 block mt-0.5">
                                  Bs{" "}
                                  {priceBs.toLocaleString(
                                    "es-VE",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }
                                  )}{" "}
                                  / ud
                                </span>

                                <span className="text-xs text-[#2E7D32] dark:text-emerald-400 block mt-0.5 font-semibold">
                                  Tasa {currency}: Bs{" "}
                                  {rate.toFixed(2)}
                                </span>

                              </div>

                              <div className="text-right font-bold text-slate-900 dark:text-white">

                                Bs{" "}
                                {subtotalBs.toLocaleString(
                                  "es-VE",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}

                                <span className="block text-xs text-slate-400 font-normal">
                                  {symbol}
                                  {subtotalCurrency.toFixed(2)}{" "}
                                  {currency}
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