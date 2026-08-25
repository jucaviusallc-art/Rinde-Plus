import React from "react";
import {
  Wallet,
  ShoppingCart,
  PlusCircle,
  History,
  Users,
  Settings,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { Budget, CartSummary, ScreenName, Currency } from "../types";

interface DashboardScreenProps {
  budget: Budget | null;
  cartSummary: CartSummary | null;
  monedaSeleccionada: Currency;
  selectedRate: number;
  onNavigate: (screen: ScreenName) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  budget,
  cartSummary,
  monedaSeleccionada,
  selectedRate,
  onNavigate,
}) => {
  const montoBs = budget?.monto_bs || 0;
  const spentBs = budget?.spent_bs || cartSummary?.total_bs || 0;
  const remainingBs = Math.max(0, montoBs - spentBs);

  // Utiliza la tasa activa seleccionada (EUR o USD)
  const activeRate =
    Number.isFinite(selectedRate) && selectedRate > 0
      ? selectedRate
      : budget?.active_rate || 72.5;

  const currencySymbol = monedaSeleccionada === "EUR" ? "€" : "$";
  const currencyLabel = monedaSeleccionada === "EUR" ? "EUR" : "USD";

  const initialCurrency = activeRate > 0 ? montoBs / activeRate : 0;
  const spentCurrency = activeRate > 0 ? spentBs / activeRate : 0;
  const remainingCurrency = activeRate > 0 ? remainingBs / activeRate : 0;

  // Porcentajes
  const percentageSpent = montoBs > 0 ? (spentBs / montoBs) * 100 : 0;
  const percentageRemaining = Math.max(
    0,
    Math.min(100, Math.round(100 - percentageSpent))
  );

  let statusColor: "green" | "yellow" | "red" = "green";
  if (percentageSpent >= 100) {
    statusColor = "red";
  } else if (percentageSpent >= 80) {
    statusColor = "yellow";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Top Banner / Tasa Activa Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Control de Compra
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitorea tus gastos en bolívares y en {currencyLabel} en tiempo real
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white shrink-0">
          <TrendingUp className="w-4 h-4 text-[#2E7D32]" />
          <span>Tasa {currencyLabel}:</span>
          <span className="text-[#2E7D32] dark:text-emerald-400 font-extrabold">
            1 {currencyLabel} = Bs {activeRate.toFixed(2)}
          </span>
          <span className="text-[10px] uppercase tracking-wider bg-emerald-200/60 dark:bg-emerald-900/80 text-[#2E7D32] dark:text-emerald-300 px-1.5 py-0.5 rounded-md ml-1 font-extrabold">
            {monedaSeleccionada === "EUR"
              ? "EUR"
              : budget?.tipo_tasa === "custom"
              ? "Custom"
              : "BCV"}
          </span>
        </div>
      </div>

      {/* 3 Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Disponible */}
        <div className="bg-linear-to-br from-emerald-500 to-emerald-700 text-white rounded-3xl p-5 shadow-md shadow-emerald-900/10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              1. Disponible
            </span>
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight">
              Bs{" "}
              {remainingBs.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-emerald-100 font-medium text-sm mt-1">
              ≈ {currencySymbol}
              {remainingCurrency.toFixed(2)} {currencyLabel}
            </div>
          </div>
        </div>

        {/* Card 2: Gastado */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              2. Gastado
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Bs{" "}
              {spentBs.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
              ≈ {currencySymbol}
              {spentCurrency.toFixed(2)} {currencyLabel}
            </div>
          </div>
        </div>

        {/* Card 3: Presupuesto Inicial */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              3. Presupuesto Inicial
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
              <Settings className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Bs{" "}
              {montoBs.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
              ≈ {currencySymbol}
              {initialCurrency.toFixed(2)} {currencyLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Status Card */}
      <div
        className={`p-6 rounded-3xl border shadow-xs transition-all ${
          statusColor === "green"
            ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white"
            : statusColor === "yellow"
            ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-slate-900 dark:text-white"
            : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white"
        }`}
      >
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              statusColor === "green"
                ? "bg-[#2E7D32] text-white"
                : statusColor === "yellow"
                ? "bg-amber-500 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {statusColor === "green" && <CheckCircle2 className="w-7 h-7" />}
            {statusColor === "yellow" && <AlertTriangle className="w-7 h-7" />}
            {statusColor === "red" && <XCircle className="w-7 h-7" />}
          </div>

          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
              Estado de Presupuesto
            </div>
            <div className="text-lg sm:text-xl font-bold leading-snug">
              {statusColor === "green" && (
                <span>
                  🟢 Te quedan{" "}
                  <strong className="font-black text-[#2E7D32] dark:text-emerald-400">
                    Bs{" "}
                    {remainingBs.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                  . Puedes seguir comprando con tranquilidad.
                </span>
              )}
              {statusColor === "yellow" && (
                <span>
                  🟡 Has utilizado el{" "}
                  <strong className="font-black text-amber-700 dark:text-amber-300">
                    {Math.round(percentageSpent)}%
                  </strong>{" "}
                  de tu presupuesto. Compra con cuidado.
                </span>
              )}
              {statusColor === "red" && (
                <span>
                  🔴 Has alcanzado tu presupuesto. Revisa tu carrito antes de
                  continuar.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300">
              Progreso de compra:
            </span>
            <span
              className={
                statusColor === "green"
                  ? "text-[#2E7D32] dark:text-emerald-400"
                  : statusColor === "yellow"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              Te queda {percentageRemaining}%
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                statusColor === "green"
                  ? "bg-[#2E7D32]"
                  : statusColor === "yellow"
                  ? "bg-amber-500"
                  : "bg-rose-600"
              }`}
              style={{ width: `${Math.min(100, percentageSpent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate("agregar")}
            id="btn-quick-agregar"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2E7D32] dark:hover:border-emerald-500 rounded-2xl shadow-xs hover:shadow-md transition-all text-left group flex flex-col justify-between h-28"
          >
            <div className="p-2.5 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-bold text-slate-900 dark:text-white text-sm">
                Agregar
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Nuevo producto
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate("carrito")}
            id="btn-quick-carrito"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2E7D32] dark:hover:border-emerald-500 rounded-2xl shadow-xs hover:shadow-md transition-all text-left group flex flex-col justify-between h-28 relative"
          >
            <div className="p-2.5 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            {cartSummary && cartSummary.total_items > 0 && (
              <span className="absolute top-3 right-3 bg-[#2E7D32] text-white font-extrabold text-xs px-2 py-0.5 rounded-full">
                {cartSummary.total_items}
              </span>
            )}
            <div>
              <span className="block font-bold text-slate-900 dark:text-white text-sm">
                Carrito
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {cartSummary?.total_items || 0} items cargados
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate("historial")}
            id="btn-quick-historial"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2E7D32] dark:hover:border-emerald-500 rounded-2xl shadow-xs hover:shadow-md transition-all text-left group flex flex-col justify-between h-28"
          >
            <div className="p-2.5 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-bold text-slate-900 dark:text-white text-sm">
                Historial
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Compras pasadas
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate("comunidad")}
            id="btn-quick-comunidad"
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2E7D32] dark:hover:border-emerald-500 rounded-2xl shadow-xs hover:shadow-md transition-all text-left group flex flex-col justify-between h-28"
          >
            <div className="p-2.5 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-bold text-slate-900 dark:text-white text-sm">
                Comunidad
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Precios compartidos
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};