import React, { useState, useEffect } from "react";

import {
  Wallet,
  TrendingUp,
  Settings2,
  ArrowRight,
  DollarSign,
  Euro,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  Budget,
  ExchangeRateInfo,
  RateType,
  Currency,
} from "../types";

interface HomeScreenProps {
  budget: Budget | null;
  rateInfo: ExchangeRateInfo | null;

  onSaveBudget: (
    monto_bs: number,
    tipo_tasa: RateType,
    tasa_custom: number
  ) => Promise<void>;

  onRefreshRate: () => void;
  isRefreshingRate: boolean;

  monedaSeleccionada: Currency;
  onChangeCurrency: (currency: Currency) => Promise<void>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  budget,
  rateInfo,
  onSaveBudget,
  onRefreshRate,
  isRefreshingRate,
  monedaSeleccionada,
  onChangeCurrency,
}) => {
  const [montoBsStr, setMontoBsStr] = useState<string>(
    budget?.monto_bs
      ? budget.monto_bs.toString()
      : "0"
  );

  const [tipoTasa, setTipoTasa] = useState<RateType>(
    budget?.tipo_tasa || "bcv"
  );

  const [tasaCustomStr, setTasaCustomStr] =
    useState<string>(
      budget?.tasa_custom
        ? budget.tasa_custom.toString()
        : ""
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  // --------------------------------------------------
  // SINCRONIZAR CON EL PRESUPUESTO ACTUAL
  // --------------------------------------------------

  useEffect(() => {
    if (budget) {
      setMontoBsStr(
        budget.monto_bs.toString()
      );

      setTipoTasa(
        budget.tipo_tasa
      );

      setTasaCustomStr(
        budget.tasa_custom > 0
          ? budget.tasa_custom.toString()
          : ""
      );
    }
  }, [budget]);

  // --------------------------------------------------
  // MONEDA
  // --------------------------------------------------

  const currencyLabel =
    monedaSeleccionada === "EUR"
      ? "EUR"
      : "USD";

  const currencySymbol =
    monedaSeleccionada === "EUR"
      ? "€"
      : "$";

  // --------------------------------------------------
  // TASA OFICIAL
  // --------------------------------------------------

  const officialRate =
    rateInfo &&
    Number.isFinite(Number(rateInfo.rate)) &&
    Number(rateInfo.rate) > 0
      ? Number(rateInfo.rate)
      : null;

  // --------------------------------------------------
  // PRESUPUESTO
  // --------------------------------------------------

  const parsedMontoBs =
    Number.parseFloat(montoBsStr);

  const validMontoBs =
    Number.isFinite(parsedMontoBs) &&
    parsedMontoBs > 0;

  // --------------------------------------------------
  // TASA PERSONALIZADA
  // --------------------------------------------------

  const parsedCustomRate =
    Number.parseFloat(tasaCustomStr);

  const validCustomRate =
    Number.isFinite(parsedCustomRate) &&
    parsedCustomRate > 0;

  // --------------------------------------------------
  // TASA ACTIVA
  // --------------------------------------------------

  const activeRate =
    tipoTasa === "bcv"
      ? officialRate
      : validCustomRate
        ? parsedCustomRate
        : null;

  // --------------------------------------------------
  // EQUIVALENTE
  // --------------------------------------------------

  const currencyEquivalent =
    activeRate !== null &&
    activeRate > 0 &&
    validMontoBs
      ? (
          parsedMontoBs /
          activeRate
        ).toFixed(2)
      : null;

  // --------------------------------------------------
  // GUARDAR PRESUPUESTO
  // --------------------------------------------------

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setErrorMsg(null);

    if (!validMontoBs) {
      setErrorMsg(
        "Por favor ingrese un presupuesto válido en Bs mayor a cero."
      );
      return;
    }

    if (
      tipoTasa === "bcv" &&
      officialRate === null
    ) {
      setErrorMsg(
        `La tasa oficial ${currencyLabel} todavía no está disponible. Espere a que se cargue la tasa e inténtelo nuevamente.`
      );
      return;
    }

    if (
      tipoTasa === "custom" &&
      !validCustomRate
    ) {
      setErrorMsg(
        "Por favor ingrese una tasa personalizada válida."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await onSaveBudget(
        parsedMontoBs,
        tipoTasa,
        tipoTasa === "custom"
          ? parsedCustomRate
          : (officialRate ?? 0)
      );
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          "Error al guardar el presupuesto."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------
  // CAMBIO DE MONEDA
  // --------------------------------------------------

  const handleCurrencyChange = async (
    currency: Currency
  ) => {
    if (
      currency === monedaSeleccionada
    ) {
      return;
    }

    setErrorMsg(null);

    try {
      await onChangeCurrency(currency);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          "No fue posible cambiar la moneda de referencia."
      );
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto space-y-2 py-0.5">

      {/* =================================================
          FORMULARIO PRINCIPAL
      ================================================== */}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">

        {/* ------------------------------------------------
            ENCABEZADO
        ------------------------------------------------- */}

        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">

          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">

            <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#2E7D32]" />

            Presupuesto de Compra

          </h1>

          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">

            Rinde
            <strong className="text-[#2E7D32]">
              +
            </strong>

          </span>

        </div>

        {/* ------------------------------------------------
            ERROR
        ------------------------------------------------- */}

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] flex items-center gap-2">

            <AlertCircle className="w-3.5 h-3.5 shrink-0" />

            <span>
              {errorMsg}
            </span>

          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-2.5"
        >

          {/* =================================================
              PRESUPUESTO + MONEDA
          ================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

            {/* PRESUPUESTO */}

            <div>

              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">

                Presupuesto Inicial (Bs)

              </label>

              <div className="relative">

                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">

                  Bs

                </span>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 3500.00"
                  value={montoBsStr}
                  onChange={(e) =>
                    setMontoBsStr(
                      e.target.value
                    )
                  }
                  onFocus={(e) =>
                    e.target.select()
                  }
                  required
                  id="input-presupuesto-bs"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                />

              </div>

            </div>

            {/* MONEDA */}

            <div>

              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">

                Moneda de Referencia

              </label>

              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">

                <button
                  type="button"
                  onClick={() =>
                    handleCurrencyChange("USD")
                  }
                  className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all ${
                    monedaSeleccionada === "USD"
                      ? "bg-white dark:bg-slate-700 text-[#2E7D32] dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-white/50"
                  }`}
                >

                  <DollarSign className="inline-block w-3 h-3 mr-0.5" />

                  USD

                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCurrencyChange("EUR")
                  }
                  className={`py-1.5 px-2 rounded-md font-bold text-[11px] transition-all ${
                    monedaSeleccionada === "EUR"
                      ? "bg-white dark:bg-slate-700 text-[#2E7D32] dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-white/50"
                  }`}
                >

                  <Euro className="inline-block w-3 h-3 mr-0.5" />

                  EUR

                </button>

              </div>

            </div>

          </div>

          {/* =================================================
              SELECTOR DE TASA
          ================================================== */}

          <div className="space-y-1">

            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">

              Selecciona la Tasa de Cambio ({currencyLabel})

            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">

              {/* TASA OFICIAL */}

              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setTipoTasa("bcv")
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" ||
                    e.key === " "
                  ) {
                    setTipoTasa("bcv");
                  }
                }}
                id="btn-tasa-bcv"
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  tipoTasa === "bcv"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-[#2E7D32] text-slate-900 dark:text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >

                <div className="flex items-center justify-between w-full">

                  <span className="font-bold text-[11px] flex items-center gap-1">

                    <TrendingUp className="w-3 h-3 text-[#2E7D32]" />

                    Tasa Oficial BCV

                  </span>

                  <input
                    type="radio"
                    name="rate_type"
                    checked={
                      tipoTasa === "bcv"
                    }
                    onChange={() =>
                      setTipoTasa("bcv")
                    }
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                    className="accent-[#2E7D32] w-3 h-3"
                  />

                </div>

                <div className="mt-0.5 text-sm font-black text-[#2E7D32] dark:text-emerald-400 flex items-center justify-between">

                  <span>

                    {officialRate !== null
                      ? `Bs ${officialRate.toFixed(2)}`
                      : "Cargando..."}

                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshRate();
                    }}
                    className="p-0.5 hover:bg-emerald-200/50 rounded-full"
                    aria-label="Actualizar tasa"
                  >

                    <RefreshCw
                      className={`w-3 h-3 ${
                        isRefreshingRate
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                  </button>

                </div>

              </div>

              {/* TASA PERSONALIZADA */}

              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setTipoTasa("custom")
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" ||
                    e.key === " "
                  ) {
                    setTipoTasa("custom");
                  }
                }}
                id="btn-tasa-custom"
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  tipoTasa === "custom"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-[#2E7D32] text-slate-900 dark:text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >

                <div className="flex items-center justify-between w-full">

                  <span className="font-bold text-[11px]">

                    Tasa Personalizada

                  </span>

                  <input
                    type="radio"
                    name="rate_type"
                    checked={
                      tipoTasa === "custom"
                    }
                    onChange={() =>
                      setTipoTasa("custom")
                    }
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                    className="accent-[#2E7D32] w-3 h-3"
                  />

                </div>

                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">

                  Ingresa tu propia tasa manual

                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              TASA PERSONALIZADA
          ================================================== */}

          {tipoTasa === "custom" && (
            <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1">

              <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200">

                Valor manual (Bs por 1 {currencyLabel})

              </label>

              <div className="relative">

                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-700 text-[10px] font-bold">

                  Bs/{currencyLabel}

                </span>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej: 900.00"
                  value={tasaCustomStr}
                  onChange={(e) =>
                    setTasaCustomStr(
                      e.target.value
                    )
                  }
                  onFocus={(e) =>
                    e.target.select()
                  }
                  id="input-tasa-custom"
                  className="w-full pl-16 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-md font-bold text-sm text-slate-900 dark:text-white outline-none"
                />

              </div>

            </div>
          )}

          {/* =================================================
              EQUIVALENTE
          ================================================== */}

          <div className="p-2.5 bg-slate-900 text-white rounded-lg flex items-center justify-between shadow-sm">

            <div>

              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider block">

                Equivalente

              </span>

              <div className="text-lg font-black text-emerald-400 flex items-center gap-1 mt-0.5">

                {currencySymbol}

                <span>

                  {currencyEquivalent !== null
                    ? currencyEquivalent
                    : "--"}

                </span>

                <span className="text-[10px] font-medium text-slate-400">

                  {currencyLabel}

                </span>

              </div>

            </div>

            <div className="text-right text-[10px] text-slate-400">

              <span>
                Aplicada:
              </span>

              <p className="font-bold text-white text-[11px]">

                {activeRate !== null
                  ? `Bs ${activeRate.toFixed(2)}`
                  : "Esperando..."}

              </p>

            </div>

          </div>

          {/* =================================================
              BOTÓN GUARDAR
          ================================================== */}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              (
                tipoTasa === "bcv" &&
                officialRate === null
              )
            }
            id="btn-guardar-presupuesto"
            className="w-full py-2.5 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-sm sm:text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >

            {isSubmitting ? (
              <span>
                Guardando...
              </span>
            ) : (
              <>
                <span>
                  Guardar y Comenzar
                </span>

                <ArrowRight className="w-4 h-4" />
              </>
            )}

          </button>

        </form>

      </div>

    </div>
  );
};