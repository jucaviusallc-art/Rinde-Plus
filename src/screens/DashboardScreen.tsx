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

import {
  Budget,
  CartSummary,
  ScreenName,
  Currency,
} from "../types";

interface DashboardScreenProps {
  budget: Budget | null;
  cartSummary: CartSummary | null;
  monedaSeleccionada: Currency;
  selectedRate: number | null;
  onNavigate: (screen: ScreenName) => void;
}

export const DashboardScreen: React.FC<
  DashboardScreenProps
> = ({
  budget,
  cartSummary,
  monedaSeleccionada,
  selectedRate,
  onNavigate,
}) => {
  // --------------------------------------------------
  // DATOS PRINCIPALES
  // --------------------------------------------------

  const montoBs = Number(
    budget?.monto_bs || 0
  );

  const spentBs = Number(
    budget?.spent_bs ??
      cartSummary?.total_bs ??
      0
  );

  const remainingBs = Math.max(
    0,
    montoBs - spentBs
  );

  // --------------------------------------------------
  // TASA ACTIVA
  // --------------------------------------------------

  const activeRate =
    selectedRate != null &&
    Number.isFinite(selectedRate) &&
    selectedRate > 0
      ? selectedRate
      : null;

  // --------------------------------------------------
  // MONEDA
  // --------------------------------------------------

  const currencySymbol =
    monedaSeleccionada === "EUR"
      ? "€"
      : "$";

  const currencyLabel =
    monedaSeleccionada === "EUR"
      ? "EUR"
      : "USD";

  // --------------------------------------------------
  // CONVERSIONES
  // --------------------------------------------------

  const initialCurrency =
    activeRate !== null
      ? montoBs / activeRate
      : null;

  const spentCurrency =
    activeRate !== null
      ? spentBs / activeRate
      : null;

  const remainingCurrency =
    activeRate !== null
      ? remainingBs / activeRate
      : null;

  // --------------------------------------------------
  // PORCENTAJES
  // --------------------------------------------------

  const percentageSpent =
    montoBs > 0
      ? (spentBs / montoBs) * 100
      : 0;

  const percentageRemaining =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 - percentageSpent
        )
      )
    );

  // --------------------------------------------------
  // ESTADO DEL PRESUPUESTO
  // --------------------------------------------------

  let statusColor:
    | "green"
    | "yellow"
    | "red" = "green";

  if (percentageSpent >= 100) {
    statusColor = "red";
  } else if (percentageSpent >= 80) {
    statusColor = "yellow";
  }

  // --------------------------------------------------
  // FORMATO DE BOLÍVARES
  // --------------------------------------------------

  const formatBs = (value: number) =>
    value.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // --------------------------------------------------
  // FORMATO MONEDA SELECCIONADA
  // --------------------------------------------------

  const formatSelectedCurrency = (
    value: number | null
  ) =>
    value !== null
      ? value.toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto space-y-2 py-0.5">

      {/* ==================================================
          ENCABEZADO
          ================================================== */}

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-xs">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">

          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Control de Compra
            </h1>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.2">
              Monitorea tus gastos en bolívares y en{" "}
              {currencyLabel}
            </p>
          </div>

          {/* TASA */}

          <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-900 dark:text-white shrink-0">

            <TrendingUp className="w-3.5 h-3.5 text-[#2E7D32]" />

            <span>
              Tasa {currencyLabel}:
            </span>

            <span className="text-[#2E7D32] dark:text-emerald-400 font-extrabold">

              {activeRate !== null
                ? `1 ${currencyLabel} = Bs ${activeRate.toFixed(
                    2
                  )}`
                : "No disponible"}

            </span>

            <span className="text-[9px] uppercase tracking-wider bg-emerald-200/60 dark:bg-emerald-900/80 text-[#2E7D32] dark:text-emerald-300 px-1 py-0.2 rounded-md font-extrabold">

              {monedaSeleccionada ===
              "EUR"
                ? "EUR"
                : budget?.tipo_tasa ===
                  "custom"
                ? "CUSTOM"
                : "BCV"}

            </span>

          </div>

        </div>

      </div>


      {/* ==================================================
          DISPONIBLE (Ajuste milimétrico)
          ================================================== */}

      <div className="bg-linear-to-br from-emerald-500 to-emerald-700 text-white rounded-xl px-4 py-2.5 shadow-sm relative overflow-hidden">

        <div className="absolute -right-5 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-1">

          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
            Disponible
          </span>

          <div className="p-1 bg-white/20 rounded-md backdrop-blur-xs">
            <Wallet className="w-3.5 h-3.5 text-white" />
          </div>

        </div>

        <div className="text-2xl font-black tracking-tight">
          Bs {formatBs(remainingBs)}
        </div>

        <div className="text-emerald-100 font-medium text-[11px] mt-0.5">
          ≈ {currencySymbol}
          {formatSelectedCurrency(
            remainingCurrency
          )}{" "}
          {currencyLabel}
        </div>

      </div>


      {/* ==================================================
          GASTADO (Ajuste milimétrico)
          ================================================== */}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xs">

        <div className="flex items-center justify-between mb-1">

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Gastado
          </span>

          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300">
            <ShoppingCart className="w-3.5 h-3.5" />
          </div>

        </div>

        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Bs {formatBs(spentBs)}
        </div>

        <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mt-0.5">
          ≈ {currencySymbol}
          {formatSelectedCurrency(
            spentCurrency
          )}{" "}
          {currencyLabel}
        </div>

      </div>


      {/* ==================================================
          PRESUPUESTO INICIAL (Ajuste milimétrico)
          ================================================== */}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xs">

        <div className="flex items-center justify-between mb-1">

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Presupuesto Inicial
          </span>

          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300">
            <Settings className="w-3.5 h-3.5" />
          </div>

        </div>

        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Bs {formatBs(montoBs)}
        </div>

        <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mt-0.5">
          ≈ {currencySymbol}
          {formatSelectedCurrency(
            initialCurrency
          )}{" "}
          {currencyLabel}
        </div>

      </div>


      {/* ==================================================
          ESTADO DEL PRESUPUESTO
          ================================================== */}

      <div
        className={`px-3.5 py-2.5 rounded-xl border shadow-xs transition-all ${
          statusColor === "green"
            ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
            : statusColor === "yellow"
            ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
            : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
        }`}
      >

        {/* TITULO */}

        <div className="flex items-center gap-2">

          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
              statusColor === "green"
                ? "bg-[#2E7D32] text-white"
                : statusColor === "yellow"
                ? "bg-amber-500 text-white"
                : "bg-rose-600 text-white"
            }`}
          >

            {statusColor === "green" && (
              <CheckCircle2 className="w-4 h-4" />
            )}

            {statusColor === "yellow" && (
              <AlertTriangle className="w-4 h-4" />
            )}

            {statusColor === "red" && (
              <XCircle className="w-4 h-4" />
            )}

          </div>

          <div className="flex-1 min-w-0">

            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 text-slate-700 dark:text-slate-300">
              Estado del Presupuesto
            </div>

            <div className="text-xs font-bold leading-snug text-slate-900 dark:text-white mt-0.2">

              {statusColor === "green" && (
                <span>
                  🟢 Te quedan{" "}
                  <strong className="font-black text-[#2E7D32] dark:text-emerald-400">
                    Bs {formatBs(
                      remainingBs
                    )}
                  </strong>
                  . Puedes seguir comprando con tranquilidad.
                </span>
              )}

              {statusColor === "yellow" && (
                <span>
                  🟡 Has utilizado el{" "}
                  <strong className="font-black text-amber-700 dark:text-amber-300">
                    {Math.round(
                      percentageSpent
                    )}
                    %
                  </strong>{" "}
                  de tu presupuesto. Compra con cuidado.
                </span>
              )}

              {statusColor === "red" && (
                <span>
                  🔴 Has alcanzado tu presupuesto. Revisa tu carrito antes de continuar.
                </span>
              )}

            </div>

          </div>

        </div>


        {/* PROGRESO */}

        <div className="mt-2 space-y-0.5">

          <div className="flex items-center justify-between text-[10px] font-bold">

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
              Te queda{" "}
              {percentageRemaining}%
            </span>

          </div>

          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">

            <div
              className={`h-full rounded-full transition-all duration-500 ${
                statusColor === "green"
                  ? "bg-[#2E7D32]"
                  : statusColor === "yellow"
                  ? "bg-amber-500"
                  : "bg-rose-600"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    percentageSpent
                  )
                )}%`,
              }}
            />

          </div>

        </div>

      </div>


      {/* ==================================================
          ACCIONES RÁPIDAS
          ================================================== */}

      <div className="space-y-1">

        <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          Acciones Rápidas
        </h2>

        {/* LAS 4 ACCIONES EN UNA SOLA LÍNEA */}

        <div className="grid grid-cols-4 gap-1.5">

          {/* AGREGAR */}

          <button
            type="button"
            onClick={() =>
              onNavigate("agregar")
            }
            id="btn-quick-agregar"
            className="min-w-0 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2E7D32] dark:hover:border-emerald-500 rounded-xl shadow-xs hover:shadow-md transition-all group flex flex-col items-center justify-center text-center min-h-16"
          >

            <div className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">

              <PlusCircle className="w-4 h-4" />

            </div>

            <span className="block font-bold text-slate-900 dark:text-white text-[11px] mt-1">
              Agregar
            </span>

          </button>


          {/* CARRITO */}

          <button
            type="button"
            onClick={() =>
              onNavigate("carrito")
            }
            id="btn-quick-carrito"
            className="min-w-0 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2E7D32] dark:hover:border-emerald-500 rounded-xl shadow-xs hover:shadow-md transition-all group flex flex-col items-center justify-center text-center min-h-16 relative"
          >

            <div className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">

              <ShoppingCart className="w-4 h-4" />

            </div>

            {cartSummary &&
              cartSummary.total_items >
                0 && (
                <span className="absolute top-1 right-1 bg-[#2E7D32] text-white font-extrabold text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {
                    cartSummary.total_items
                  }
                </span>
              )}

            <span className="block font-bold text-slate-900 dark:text-white text-[11px] mt-1">
              Carrito
            </span>

          </button>


          {/* HISTORIAL */}

          <button
            type="button"
            onClick={() =>
              onNavigate("historial")
            }
            id="btn-quick-historial"
            className="min-w-0 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2E7D32] dark:hover:border-emerald-500 rounded-xl shadow-xs hover:shadow-md transition-all group flex flex-col items-center justify-center text-center min-h-16"
          >

            <div className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">

              <History className="w-4 h-4" />

            </div>

            <span className="block font-bold text-slate-900 dark:text-white text-[11px] mt-1">
              Historial
            </span>

          </button>


          {/* COMUNIDAD */}

          <button
            type="button"
            onClick={() =>
              onNavigate("comunidad")
            }
            id="btn-quick-comunidad"
            className="min-w-0 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2E7D32] dark:hover:border-emerald-500 rounded-xl shadow-xs hover:shadow-md transition-all group flex flex-col items-center justify-center text-center min-h-16"
          >

            <div className="p-1.5 bg-emerald-50 dark:bg-slate-800 text-[#2E7D32] dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">

              <Users className="w-4 h-4" />

            </div>

            <span className="block font-bold text-slate-900 dark:text-white text-[11px] mt-1">
              Comunidad
            </span>

          </button>

        </div>

      </div>

    </div>
  );
};