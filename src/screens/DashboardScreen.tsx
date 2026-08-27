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

  const montoBs =
    Number.isFinite(budget?.monto_bs)
      ? budget!.monto_bs
      : 0;

  const spentBs =
    Number.isFinite(budget?.spent_bs)
      ? budget!.spent_bs
      : Number.isFinite(cartSummary?.total_bs)
      ? cartSummary!.total_bs
      : 0;

  const remainingBs = Math.max(
    0,
    montoBs - spentBs
  );

  // --------------------------------------------------
  // TASA ACTIVA
  // --------------------------------------------------
  //
  // IMPORTANTE:
  // No utilizamos ninguna tasa inventada como fallback.
  // La tasa recibida desde App.tsx es la tasa correspondiente
  // a la moneda actualmente seleccionada.
  //

  const activeRate =
    Number.isFinite(selectedRate) &&
    (selectedRate ?? 0) > 0
      ? selectedRate!
      : Number.isFinite(
          budget?.active_rate
        ) &&
        (budget?.active_rate ?? 0) > 0
      ? budget!.active_rate
      : 0;

  // --------------------------------------------------
  // INFORMACIÓN DE MONEDA
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
    activeRate > 0
      ? montoBs / activeRate
      : 0;

  const spentCurrency =
    activeRate > 0
      ? spentBs / activeRate
      : 0;

  const remainingCurrency =
    activeRate > 0
      ? remainingBs / activeRate
      : 0;

  // --------------------------------------------------
  // PORCENTAJES
  // --------------------------------------------------

  const percentageSpent =
    montoBs > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (spentBs / montoBs) * 100
          )
        )
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

  const formatBs = (
    value: number
  ) => {
    return value.toLocaleString(
      "es-VE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div
      className="
        max-w-4xl
        mx-auto
        space-y-2
        py-1
        text-slate-900
        dark:text-white
      "
    >
      {/* ==================================================
          ENCABEZADO + TASA
          ================================================== */}

      <div
        className="
          bg-white
          dark:bg-slate-900
          border
          border-slate-200/80
          dark:border-slate-800
          rounded-2xl
          px-3
          sm:px-4
          py-2
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-2
          "
        >
          {/* TÍTULO */}

          <div className="min-w-0">
            <h1
              className="
                text-lg
                sm:text-xl
                font-black
                tracking-tight
                leading-tight
              "
            >
              Control de Compra
            </h1>

            <p
              className="
                text-[10px]
                sm:text-xs
                text-slate-500
                dark:text-slate-400
                leading-tight
                mt-0.5
              "
            >
              Monitorea tus gastos en tiempo real
            </p>
          </div>

          {/* TASA */}

          <div
            className="
              shrink-0
              inline-flex
              items-center
              gap-1.5
              bg-emerald-50
              dark:bg-emerald-950/60
              border
              border-emerald-200
              dark:border-emerald-800
              px-2.5
              sm:px-3
              py-1.5
              rounded-xl
              text-[10px]
              sm:text-xs
              font-bold
            "
          >
            <TrendingUp
              className="
                w-3.5
                h-3.5
                text-[#2E7D32]
                dark:text-emerald-400
                shrink-0
              "
            />

            <span
              className="
                text-[#2E7D32]
                dark:text-emerald-400
                font-extrabold
                whitespace-nowrap
              "
            >
              1 {currencyLabel} = Bs{" "}
              {activeRate > 0
                ? activeRate.toFixed(2)
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================
          INDICADORES PRINCIPALES
          SIEMPRE EN UNA FILA
          ================================================== */}

      <div
        className="
          grid
          grid-cols-3
          gap-2
        "
      >
        {/* ==================================================
            1. DISPONIBLE
            ================================================== */}

        <div
          className="
            bg-linear-to-br
            from-emerald-500
            to-emerald-700
            text-white
            rounded-2xl
            p-2.5
            shadow-sm
            flex
            flex-col
            justify-between
            min-w-0
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-1
              mb-1
            "
          >
            <span
              className="
                text-[9px]
                sm:text-[10px]
                font-bold
                uppercase
                tracking-wide
                text-emerald-100
                truncate
              "
            >
              1. Disponible
            </span>

            <Wallet
              className="
                w-3.5
                h-3.5
                text-white/80
                shrink-0
              "
            />
          </div>

          <div className="min-w-0">
            <div
              className="
                text-[11px]
                sm:text-sm
                font-black
                tracking-tight
                whitespace-nowrap
              "
            >
              Bs {formatBs(remainingBs)}
            </div>

            <div
              className="
                text-emerald-100
                text-[9px]
                sm:text-[10px]
                font-medium
                whitespace-nowrap
              "
            >
              ≈ {currencySymbol}
              {remainingCurrency.toFixed(2)}
            </div>
          </div>
        </div>

        {/* ==================================================
            2. GASTADO
            ================================================== */}

        <div
          className="
            bg-white
            dark:bg-slate-900
            border
            border-slate-200
            dark:border-slate-800
            rounded-2xl
            p-2.5
            shadow-sm
            flex
            flex-col
            justify-between
            min-w-0
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-1
              mb-1
            "
          >
            <span
              className="
                text-[9px]
                sm:text-[10px]
                font-bold
                uppercase
                tracking-wide
                text-slate-400
                truncate
              "
            >
              2. Gastado
            </span>

            <ShoppingCart
              className="
                w-3.5
                h-3.5
                text-slate-400
                shrink-0
              "
            />
          </div>

          <div className="min-w-0">
            <div
              className="
                text-[11px]
                sm:text-sm
                font-black
                tracking-tight
                whitespace-nowrap
              "
            >
              Bs {formatBs(spentBs)}
            </div>

            <div
              className="
                text-slate-500
                dark:text-slate-400
                text-[9px]
                sm:text-[10px]
                font-medium
                whitespace-nowrap
              "
            >
              ≈ {currencySymbol}
              {spentCurrency.toFixed(2)}
            </div>
          </div>
        </div>

        {/* ==================================================
            3. PRESUPUESTO INICIAL
            ================================================== */}

        <div
          className="
            bg-white
            dark:bg-slate-900
            border
            border-slate-200
            dark:border-slate-800
            rounded-2xl
            p-2.5
            shadow-sm
            flex
            flex-col
            justify-between
            min-w-0
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-1
              mb-1
            "
          >
            <span
              className="
                text-[9px]
                sm:text-[10px]
                font-bold
                uppercase
                tracking-wide
                text-slate-400
                truncate
              "
            >
              3. Presupuesto Inicial
            </span>

            <Settings
              className="
                w-3.5
                h-3.5
                text-slate-400
                shrink-0
              "
            />
          </div>

          <div className="min-w-0">
            <div
              className="
                text-[11px]
                sm:text-sm
                font-black
                tracking-tight
                whitespace-nowrap
              "
            >
              Bs {formatBs(montoBs)}
            </div>

            <div
              className="
                text-slate-500
                dark:text-slate-400
                text-[9px]
                sm:text-[10px]
                font-medium
                whitespace-nowrap
              "
            >
              ≈ {currencySymbol}
              {initialCurrency.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          ESTADO DEL PRESUPUESTO
          ================================================== */}

      <div
        className={`
          px-3
          py-2
          rounded-2xl
          border
          shadow-sm
          flex
          items-center
          gap-2.5
          ${
            statusColor === "green"
              ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
              : statusColor === "yellow"
              ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
              : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
          }
        `}
      >
        {/* ICONO DE ESTADO */}

        <div
          className={`
            w-8
            h-8
            rounded-xl
            flex
            items-center
            justify-center
            shrink-0
            ${
              statusColor === "green"
                ? "bg-[#2E7D32] text-white"
                : statusColor === "yellow"
                ? "bg-amber-500 text-white"
                : "bg-rose-600 text-white"
            }
          `}
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

        {/* INFORMACIÓN */}

        <div className="flex-1 min-w-0">
          <div
            className="
              flex
              items-center
              justify-between
              gap-2
              text-[10px]
              font-bold
              mb-0.5
            "
          >
            <span className="uppercase opacity-75">
              Estado de Presupuesto
            </span>

            <span
              className={
                statusColor === "green"
                  ? "text-[#2E7D32] dark:text-emerald-400 whitespace-nowrap"
                  : statusColor === "yellow"
                  ? "text-amber-700 dark:text-amber-400 whitespace-nowrap"
                  : "text-rose-600 dark:text-rose-400 whitespace-nowrap"
              }
            >
              Queda {percentageRemaining}%
            </span>
          </div>

          <div
            className="
              text-[10px]
              sm:text-xs
              font-bold
              leading-tight
              truncate
            "
          >
            {statusColor === "green" && (
              <span>
                🟢 Te quedan{" "}
                <strong className="text-[#2E7D32] dark:text-emerald-400">
                  Bs {formatBs(remainingBs)}
                </strong>
                . Compra con tranquilidad.
              </span>
            )}

            {statusColor === "yellow" && (
              <span>
                🟡 Has utilizado el{" "}
                <strong className="text-amber-700 dark:text-amber-300">
                  {Math.round(
                    percentageSpent
                  )}
                  %
                </strong>
                . Compra con cuidado.
              </span>
            )}

            {statusColor === "red" && (
              <span>
                🔴 Presupuesto alcanzado.
                Revisa tu carrito.
              </span>
            )}
          </div>

          {/* BARRA DE PROGRESO */}

          <div
            className="
              w-full
              h-1
              bg-slate-200
              dark:bg-slate-800
              rounded-full
              overflow-hidden
              mt-1
            "
          >
            <div
              className={`
                h-full
                rounded-full
                ${
                  statusColor === "green"
                    ? "bg-[#2E7D32]"
                    : statusColor === "yellow"
                    ? "bg-amber-500"
                    : "bg-rose-600"
                }
              `}
              style={{
                width: `${Math.min(
                  100,
                  percentageSpent
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
        <h2
          className="
            text-[10px]
            sm:text-[11px]
            font-bold
            text-slate-500
            dark:text-slate-400
            uppercase
            tracking-wider
            px-1
          "
        >
          Acciones Rápidas
        </h2>

        <div
          className="
            grid
            grid-cols-4
            gap-2
          "
        >
          {/* ==================================================
              AGREGAR
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              onNavigate("agregar")
            }
            id="btn-quick-agregar"
            className="
              min-h-16
              p-1.5
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              hover:border-[#2E7D32]
              rounded-2xl
              shadow-sm
              text-center
              flex
              flex-col
              items-center
              justify-center
              gap-1
              group
              transition-colors
            "
          >
            <div
              className="
                p-1.5
                bg-emerald-50
                dark:bg-slate-800
                text-[#2E7D32]
                dark:text-emerald-400
                rounded-xl
                group-hover:scale-110
                transition-transform
              "
            >
              <PlusCircle className="w-4 h-4" />
            </div>

            <span
              className="
                font-bold
                text-[10px]
                sm:text-[11px]
              "
            >
              Agregar
            </span>
          </button>

          {/* ==================================================
              CARRITO
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              onNavigate("carrito")
            }
            id="btn-quick-carrito"
            className="
              min-h-16
              p-1.5
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              hover:border-[#2E7D32]
              rounded-2xl
              shadow-sm
              text-center
              flex
              flex-col
              items-center
              justify-center
              gap-1
              group
              relative
              transition-colors
            "
          >
            <div
              className="
                p-1.5
                bg-emerald-50
                dark:bg-slate-800
                text-[#2E7D32]
                dark:text-emerald-400
                rounded-xl
                group-hover:scale-110
                transition-transform
              "
            >
              <ShoppingCart className="w-4 h-4" />
            </div>

            {cartSummary &&
              cartSummary.total_items >
                0 && (
                <span
                  className="
                    absolute
                    top-1
                    right-1
                    min-w-4
                    h-4
                    px-1
                    flex
                    items-center
                    justify-center
                    bg-[#2E7D32]
                    text-white
                    font-extrabold
                    text-[8px]
                    rounded-full
                  "
                >
                  {
                    cartSummary.total_items
                  }
                </span>
              )}

            <span
              className="
                font-bold
                text-[10px]
                sm:text-[11px]
              "
            >
              Carrito
            </span>
          </button>

          {/* ==================================================
              HISTORIAL
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              onNavigate("historial")
            }
            id="btn-quick-historial"
            className="
              min-h-16
              p-1.5
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              hover:border-[#2E7D32]
              rounded-2xl
              shadow-sm
              text-center
              flex
              flex-col
              items-center
              justify-center
              gap-1
              group
              transition-colors
            "
          >
            <div
              className="
                p-1.5
                bg-emerald-50
                dark:bg-slate-800
                text-[#2E7D32]
                dark:text-emerald-400
                rounded-xl
                group-hover:scale-110
                transition-transform
              "
            >
              <History className="w-4 h-4" />
            </div>

            <span
              className="
                font-bold
                text-[10px]
                sm:text-[11px]
              "
            >
              Historial
            </span>
          </button>

          {/* ==================================================
              COMUNIDAD
              ================================================== */}

          <button
            type="button"
            onClick={() =>
              onNavigate("comunidad")
            }
            id="btn-quick-comunidad"
            className="
              min-h-16
              p-1.5
              bg-white
              dark:bg-slate-900
              border
              border-slate-200
              dark:border-slate-800
              hover:border-[#2E7D32]
              rounded-2xl
              shadow-sm
              text-center
              flex
              flex-col
              items-center
              justify-center
              gap-1
              group
              transition-colors
            "
          >
            <div
              className="
                p-1.5
                bg-emerald-50
                dark:bg-slate-800
                text-[#2E7D32]
                dark:text-emerald-400
                rounded-xl
                group-hover:scale-110
                transition-transform
              "
            >
              <Users className="w-4 h-4" />
            </div>

            <span
              className="
                font-bold
                text-[10px]
                sm:text-[11px]
              "
            >
              Comunidad
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};