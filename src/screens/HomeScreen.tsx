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
    budget?.monto_bs ? budget.monto_bs.toString() : "0"
  );

  const [tipoTasa, setTipoTasa] = useState<RateType>(
    budget?.tipo_tasa || "bcv"
  );

  const [tasaCustomStr, setTasaCustomStr] = useState<string>(
    budget?.tasa_custom
      ? budget.tasa_custom.toString()
      : "75.00"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (budget) {
      setMontoBsStr(budget.monto_bs.toString());
      setTipoTasa(budget.tipo_tasa);
      setTasaCustomStr(budget.tasa_custom.toString());
    }
  }, [budget]);

  const currencyLabel =
    monedaSeleccionada === "EUR"
      ? "EUR"
      : "USD";

  const currencySymbol =
    monedaSeleccionada === "EUR"
      ? "€"
      : "$";

  const bcvRate =
    rateInfo?.rate || 72.5;

  const parsedMontoBs =
    parseFloat(montoBsStr) || 0;

  const parsedCustomRate =
    parseFloat(tasaCustomStr) ||
    bcvRate;

  const activeRate =
    tipoTasa === "bcv"
      ? bcvRate
      : parsedCustomRate;

  const currencyEquivalent =
    activeRate > 0 && parsedMontoBs > 0
      ? (
          parsedMontoBs /
          activeRate
        ).toFixed(2)
      : "0.00";

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setErrorMsg(null);

    if (parsedMontoBs <= 0) {
      setErrorMsg(
        "Por favor ingrese un presupuesto válido en Bs mayor a cero."
      );
      return;
    }

    if (
      tipoTasa === "custom" &&
      parsedCustomRate <= 0
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
        parsedCustomRate
      );
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          "Error al guardar el presupuesto."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">

      {/* Hero Welcome Card */}
      <div className="bg-linear-to-br from-[#2E7D32]/10 via-emerald-50 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-[#2E7D32] text-white rounded-2xl shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Rinde
            <span className="text-[#2E7D32] font-black">
              +
            </span>
          </h1>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-xl">
          Controla tu presupuesto de compras en
          tiempo real en Venezuela. Convierte Bs a{" "}
          {currencyLabel} instantáneamente usando la
          tasa seleccionada.
        </p>
      </div>

      {/* Main Budget Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[#2E7D32]" />
          Configura tu Presupuesto de Compra
        </h2>

        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* Presupuesto Inicial */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Presupuesto Inicial en Bolívares (Bs)
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                Bs
              </span>

              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 3500.00"
                value={montoBsStr}
                onChange={(e) =>
                  setMontoBsStr(e.target.value)
                }
                onFocus={(e) =>
                  e.target.select()
                }
                required
                id="input-presupuesto-bs"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Selector de Tasa */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Selecciona la Tasa de Cambio (
              Bs/{currencyLabel})
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* BCV */}
              <button
                type="button"
                onClick={() =>
                  setTipoTasa("bcv")
                }
                id="btn-tasa-bcv"
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  tipoTasa === "bcv"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-[#2E7D32] text-slate-900 dark:text-white shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#2E7D32]" />
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
                    className="accent-[#2E7D32] w-4 h-4"
                  />
                </div>

                <div className="mt-2 text-lg font-black text-[#2E7D32] dark:text-emerald-400 flex items-center justify-between">
                  <span>
                    Bs {bcvRate.toFixed(2)}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshRate();
                    }}
                    title={`Actualizar BCV ${currencyLabel}`}
                    className="p-1 hover:bg-emerald-200/50 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isRefreshingRate
                          ? "animate-spin"
                          : ""
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Obtenida del Banco Central de
                  Venezuela
                </p>
              </button>

              {/* Tasa personalizada */}
              <button
                type="button"
                onClick={() =>
                  setTipoTasa("custom")
                }
                id="btn-tasa-custom"
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  tipoTasa === "custom"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-[#2E7D32] text-slate-900 dark:text-white shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-sm">
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
                    className="accent-[#2E7D32] w-4 h-4"
                  />
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Ingresa tu propia tasa de cambio
                  manual
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Útil para acordar tasas de tienda
                  o paralelo
                </p>
              </button>
            </div>
          </div>

          {/* Tasa personalizada */}
          {tipoTasa === "custom" && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-2 animate-fadeIn">
              <label className="block text-sm font-semibold text-amber-900 dark:text-amber-200">
                Ingresa el valor de la tasa manual
                (Bs por 1 {currencyLabel})
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  Bs/{currencyLabel}
                </span>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej: 75.50"
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
                  className="w-full pl-20 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                />
              </div>
            </div>
          )}

          {/* Equivalent Currency Display */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Equivalente en{" "}
                {currencyLabel}
              </span>

              <div className="text-3xl font-black text-emerald-400 mt-1 flex items-center gap-1">
                {monedaSeleccionada ===
                "EUR" ? (
                  <Euro className="w-7 h-7 shrink-0 text-emerald-400" />
                ) : (
                  <DollarSign className="w-7 h-7 shrink-0 text-emerald-400" />
                )}

                <span>
                  {currencyEquivalent}
                </span>

                <span className="text-sm font-medium text-slate-400 ml-1">
                  {currencyLabel}
                </span>
              </div>
            </div>

            <div className="text-right text-xs text-slate-400">
              <span>Tasa aplicada:</span>

              <p className="font-bold text-white text-sm">
                Bs {activeRate.toFixed(2)} /{" "}
                {currencyLabel}
              </p>
            </div>
          </div>

          {/* Save & Start */}
          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-guardar-presupuesto"
            className="w-full py-4 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Guardando...</span>
            ) : (
              <>
                <span>
                  Guardar y comenzar
                </span>

                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
};