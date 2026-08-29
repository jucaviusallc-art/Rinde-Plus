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
    <div className="max-w-2xl mx-auto space-y-2 py-0.5">

      {/* ENCABEZADO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-xs">
        <button
          type="button"
          onClick={() =>
            onNavigate("inicio")
          }
          className="mb-1 text-xs font-semibold text-slate-500 hover:text-[#2E7D32] transition-colors"
        >
          ← Volver
        </button>

        <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#2E7D32] text-white flex items-center justify-center font-bold text-sm">
            +
          </span>

          Agregar Producto
        </h1>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Ingresa el precio en{" "}
          <strong className="text-slate-700 dark:text-slate-200">
            {currencyName} ({currencyCode})
          </strong>{" "}
          para convertirlo automáticamente a bolívares.
        </p>
      </div>

      {/* FORMULARIO */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5"
      >

        {/* NOMBRE */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
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
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
          />
        </div>

        {/* PRECIO */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
            Precio en {currencyName} ({currencyCode})
          </label>

          <div className="relative">

            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-base pointer-events-none">
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
              className="w-full pl-9 pr-14 py-2.5 rounded-xl border border-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-[#2E7D32] hover:bg-emerald-800 disabled:opacity-60 text-white flex items-center justify-center transition-colors shadow-xs"
            >
              {isScanning ? (
                <ScanLine className="w-4 h-4 animate-pulse" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>

          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Toma una fotografía del precio. Rinde+ intentará reconocerlo automáticamente.
          </p>
        </div>

        {/* CANTIDAD */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
            Cantidad
          </label>

          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 h-10">

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
              className="w-12 h-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-black text-lg transition-colors"
            >
              −
            </button>

            <div className="flex-1 text-center font-bold text-sm text-slate-900 dark:text-white">
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
              className="w-12 h-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-black text-lg transition-colors"
            >
              +
            </button>

          </div>
        </div>

        {/* CONVERSIÓN */}
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 space-y-2">

          <div className="flex justify-between items-center gap-2 text-xs">

            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              Conversión Automática en Bolívares
            </span>

            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Tasa {currencyCode}: Bs {activeRate > 0 ? activeRate.toFixed(2) : "—"}
            </span>

          </div>

          <div className="grid grid-cols-2 gap-2">

            {/* PRECIO UNITARIO */}
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Precio unitario
              </p>

              <p className="text-base font-black text-slate-900 dark:text-white">
                Bs {unitPriceBs.toFixed(2)}
              </p>
            </div>

            {/* SUBTOTAL */}
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Subtotal ({quantity} ud)
              </p>

              <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                Bs {subtotalBs.toFixed(2)}
              </p>
            </div>

          </div>

          <div className="border-t border-emerald-200 dark:border-emerald-800 pt-2 text-[11px] text-slate-500 dark:text-slate-400">

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
          className="w-full py-3 rounded-xl bg-[#2E7D32] hover:bg-emerald-800 text-white font-black text-sm shadow-md transition-colors disabled:opacity-50 mt-1"
        >
          Agregar al Carrito
        </button>

      </form>
    </div>
  );
};

export default AddProductScreen;