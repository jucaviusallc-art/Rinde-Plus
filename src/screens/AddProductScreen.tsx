import React, { useMemo, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import {
  Budget,
  ScreenName,
  Currency,
} from "../types";
import { scanCurrencyAmount } from "../utils/scanner";

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

export const AddProductScreen: React.FC<
  AddProductScreenProps
> = ({
  budget,
  monedaSeleccionada,
  selectedRate,
  onAddToCart,
  onNavigate,
}) => {
  const [productName, setProductName] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [isScanning, setIsScanning] =
    useState(false);

  // --------------------------------------------------
  // TASA ACTIVA
  // --------------------------------------------------
  //
  // REGLA:
  //
  // 1. Si el presupuesto utiliza una tasa
  //    personalizada, se utiliza esa tasa.
  //
  // 2. Si NO es personalizada, selectedRate
  //    es la fuente de verdad.
  //
  //    selectedRate viene desde App.tsx y ya
  //    corresponde a la moneda seleccionada:
  //
  //       USD -> tasa USD
  //       EUR -> tasa EUR
  //
  // Esto evita que una tasa vieja almacenada
  // en el presupuesto reemplace la tasa actual.
  //
  const activeRate =
    budget?.tipo_tasa === "custom" &&
    Number.isFinite(budget.active_rate) &&
    budget.active_rate > 0
      ? budget.active_rate
      : Number.isFinite(selectedRate ?? NaN) &&
        (selectedRate ?? 0) > 0
      ? selectedRate!
      : 0;

  // --------------------------------------------------
  // INFORMACIÓN DE MONEDA
  // --------------------------------------------------

  const currencySymbol =
    monedaSeleccionada === "EUR"
      ? "€"
      : "$";

  const currencyName =
    monedaSeleccionada === "EUR"
      ? "Euro"
      : "Dólar";

  const currencyCode =
    monedaSeleccionada;

  // --------------------------------------------------
  // PRECIO
  // --------------------------------------------------

  const priceNumber =
    Number.parseFloat(price) || 0;

  // --------------------------------------------------
  // CONVERSIONES
  // --------------------------------------------------

  const unitPriceBs = useMemo(() => {
    if (
      priceNumber <= 0 ||
      activeRate <= 0
    ) {
      return 0;
    }

    return priceNumber * activeRate;
  }, [
    priceNumber,
    activeRate,
  ]);

  const subtotalBs = useMemo(() => {
    if (
      priceNumber <= 0 ||
      quantity <= 0 ||
      activeRate <= 0
    ) {
      return 0;
    }

    return (
      priceNumber *
      quantity *
      activeRate
    );
  }, [
    priceNumber,
    quantity,
    activeRate,
  ]);

  // --------------------------------------------------
  // ESCANEAR PRECIO
  // --------------------------------------------------

  const handleScan = async () => {
    if (isScanning) {
      return;
    }

    try {
      setIsScanning(true);

      const scannedValue =
        await scanCurrencyAmount();

      if (scannedValue) {
        setPrice(scannedValue);
      } else {
        alert(
          `No se pudo detectar un precio en ${currencyName}. Intenta tomar una fotografía más cercana y enfocada en el precio.`
        );
      }
    } catch (error) {
      console.error(
        "Error durante el escaneo:",
        error
      );

      alert(
        "No fue posible escanear el precio. Intenta nuevamente."
      );
    } finally {
      setIsScanning(false);
    }
  };

  // --------------------------------------------------
  // AGREGAR AL CARRITO
  // --------------------------------------------------

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const name =
      productName.trim();

    const parsedPrice =
      Number.parseFloat(price);

    // Validar nombre
    if (!name) {
      alert(
        "Ingresa el nombre del producto."
      );
      return;
    }

    // Validar precio
    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0
    ) {
      alert(
        `Ingresa un precio válido en ${currencyName}.`
      );
      return;
    }

    // Validar cantidad
    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      alert(
        "La cantidad debe ser de al menos 1."
      );
      return;
    }

    // Validar tasa
    if (
      !Number.isFinite(activeRate) ||
      activeRate <= 0
    ) {
      alert(
        `No hay una tasa válida para ${currencyName}. Actualiza la tasa e intenta nuevamente.`
      );
      return;
    }

    try {
      // ------------------------------------------------
      // IMPORTANTE
      // ------------------------------------------------
      //
      // La moneda que se envía al servidor es
      // exactamente la que está seleccionada
      // en Inicio.
      //
      // Nunca se convierte EUR -> USD aquí.
      //
      console.log(
        "[RINDE+] ADD PRODUCT",
        {
          name,
          price: parsedPrice,
          quantity,
          currency:
            monedaSeleccionada,
          rate: activeRate,
          rateSource:
            budget?.tipo_tasa ===
            "custom"
              ? "custom-budget"
              : "selected-currency",
        }
      );

      await onAddToCart(
        name,
        parsedPrice,
        quantity,
        monedaSeleccionada
      );

      // Limpiar formulario
      setProductName("");
      setPrice("");
      setQuantity(1);

      // Ir al carrito
      onNavigate("carrito");
    } catch (error) {
      console.error(
        "Error agregando producto al carrito:",
        error
      );

      alert(
        "No fue posible agregar el producto al carrito. Intenta nuevamente."
      );
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">

      {/* ENCABEZADO */}
      <div>
        <button
          type="button"
          onClick={() =>
            onNavigate("inicio")
          }
          className="mb-3 text-sm font-semibold text-slate-500 hover:text-[#2E7D32] transition-colors"
        >
          ← Volver
        </button>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center">
            +
          </span>

          Agregar Producto
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ingresa el precio en{" "}
          <strong className="text-slate-700 dark:text-slate-200">
            {currencyName} (
            {currencyCode})
          </strong>{" "}
          para convertirlo automáticamente a bolívares.
        </p>
      </div>

      {/* FORMULARIO */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6"
      >

        {/* NOMBRE */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
            Nombre del Producto
          </label>

          <input
            type="text"
            value={productName}
            onChange={(event) =>
              setProductName(
                event.target.value
              )
            }
            placeholder="Ej: Harina Pan, Queso Blanco, Arroz..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
          />
        </div>

        {/* PRECIO */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
            Precio en {currencyName} (
            {currencyCode})
          </label>

          <div className="relative">

            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-lg pointer-events-none">
              {currencySymbol}
            </span>

            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={price}
              onChange={(event) =>
                setPrice(
                  event.target.value
                )
              }
              placeholder="0.00"
              className="w-full pl-9 pr-16 py-4 rounded-xl border border-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={handleScan}
              disabled={isScanning}
              title={
                isScanning
                  ? "Escaneando precio..."
                  : "Escanear precio con la cámara"
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-[#2E7D32] hover:bg-emerald-800 disabled:opacity-60 text-white flex items-center justify-center transition-colors shadow-md"
            >
              {isScanning ? (
                <ScanLine className="w-5 h-5 animate-pulse" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>

          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Toma una fotografía del precio.
            Rinde+ intentará reconocerlo
            automáticamente.
          </p>
        </div>

        {/* CANTIDAD */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
            Cantidad
          </label>

          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">

            <button
              type="button"
              onClick={() =>
                setQuantity(
                  (current) =>
                    Math.max(
                      1,
                      current - 1
                    )
                )
              }
              className="w-14 h-12 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-black text-xl transition-colors"
            >
              −
            </button>

            <div className="flex-1 text-center font-bold text-lg text-slate-900 dark:text-white">
              {quantity}
            </div>

            <button
              type="button"
              onClick={() =>
                setQuantity(
                  (current) =>
                    current + 1
                )
              }
              className="w-14 h-12 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-black text-xl transition-colors"
            >
              +
            </button>

          </div>
        </div>

        {/* CONVERSIÓN */}
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-5">

          <div className="flex justify-between items-center gap-3 text-sm mb-4">

            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              Conversión Automática en Bolívares
            </span>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tasa {currencyCode}:{" "}
              Bs{" "}
              {activeRate > 0
                ? activeRate.toFixed(2)
                : "—"}
            </span>

          </div>

          <div className="grid grid-cols-2 gap-4">

            {/* PRECIO UNITARIO */}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Precio unitario
              </p>

              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                Bs{" "}
                {unitPriceBs.toFixed(2)}
              </p>
            </div>

            {/* SUBTOTAL */}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Subtotal ({quantity} ud)
              </p>

              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                Bs{" "}
                {subtotalBs.toFixed(2)}
              </p>
            </div>

          </div>

          <div className="border-t border-emerald-200 dark:border-emerald-800 mt-4 pt-3 text-xs text-slate-500 dark:text-slate-400">

            Precio ingresado:{" "}

            <strong className="text-slate-800 dark:text-slate-200">
              {currencySymbol}
              {priceNumber.toFixed(2)}{" "}
              {currencyCode}
            </strong>

          </div>
        </div>

        {/* GUARDAR */}
        <button
          type="submit"
          disabled={
            !productName.trim() ||
            priceNumber <= 0 ||
            activeRate <= 0
          }
          className="w-full py-4 rounded-xl bg-[#2E7D32] hover:bg-emerald-800 text-white font-black text-base shadow-lg transition-colors disabled:opacity-50"
        >
          Agregar al Carrito
        </button>

      </form>
    </div>
  );
};