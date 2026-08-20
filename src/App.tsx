import React, { useState, useEffect, useCallback } from "react";
import {
  ScreenName,
  Budget,
  CartSummary,
  HistoryRecord,
  ExchangeRateInfo,
  RateType,
} from "./types";
import { apiService } from "./services/api";
import { Header } from "./components/Header";
import { Navigation } from "./components/Navigation";
import { HomeScreen } from "./screens/HomeScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { AddProductScreen } from "./screens/AddProductScreen";
import { CartScreen } from "./screens/CartScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { CommunityScreen } from "./screens/CommunityScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

type Currency = "USD" | "EUR";

export default function App() {
  const [currentScreen, setCurrentScreen] =
    useState<ScreenName>("inicio");

  const [budget, setBudget] = useState<Budget | null>(null);
  const [cartSummary, setCartSummary] =
    useState<CartSummary | null>(null);
  const [rateInfo, setRateInfo] =
    useState<ExchangeRateInfo | null>(null);
  const [history, setHistory] =
    useState<HistoryRecord[]>([]);

  const [monedaSeleccionada, setMonedaSeleccionada] =
    useState<Currency>(() => {
      const savedCurrency =
        localStorage.getItem("rinde_currency");

      return savedCurrency === "EUR" ? "EUR" : "USD";
    });

  const [selectedRateInfo, setSelectedRateInfo] =
    useState<ExchangeRateInfo | null>(null);

  const [isDarkMode, setIsDarkMode] =
    useState<boolean>(() => {
      return (
        localStorage.getItem("rinde_theme") === "dark"
      );
    });

  const [isRefreshingRate, setIsRefreshingRate] =
    useState<boolean>(false);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  // --------------------------------------------------
  // TEMA
  // --------------------------------------------------

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("rinde_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("rinde_theme", "light");
    }
  }, [isDarkMode]);

  // --------------------------------------------------
  // CARGA DE DATOS
  // --------------------------------------------------

  const refreshAppData = useCallback(async () => {
    try {
      const [
        bData,
        cData,
        rData,
        hData,
      ] = await Promise.all([
        apiService.getBudget(),
        apiService.getCart(),
        apiService.getExchangeRate("USD"),
        apiService.getHistory(),
      ]);

      setBudget(bData);
      setCartSummary(cData);
      setRateInfo(rData);
      setHistory(hData);

      const selectedRate =
        monedaSeleccionada === "EUR"
          ? await apiService.getExchangeRate("EUR")
          : rData;

      setSelectedRateInfo(selectedRate);
    } catch (err) {
      console.error(
        "Error loading app data:",
        err
      );
    } finally {
      setIsLoading(false);
    }
  }, [monedaSeleccionada]);

  // --------------------------------------------------
  // INICIALIZACIÓN
  // --------------------------------------------------

  const initializeApp = useCallback(async () => {
    setIsLoading(true);
    setIsRefreshingRate(true);

    try {
      await apiService.refreshExchangeRate();
    } catch (err) {
      console.error(
        "Could not automatically refresh the BCV exchange rate:",
        err
      );
    } finally {
      setIsRefreshingRate(false);
    }

    await refreshAppData();
  }, [refreshAppData]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // --------------------------------------------------
  // CAMBIO DE MONEDA
  // --------------------------------------------------

  const handleChangeCurrency = async (
    currency: Currency
  ) => {
    setMonedaSeleccionada(currency);

    localStorage.setItem(
      "rinde_currency",
      currency
    );

    try {
      const newRate =
        await apiService.getExchangeRate(currency);

      setSelectedRateInfo(newRate);
      await refreshAppData();
    } catch (err) {
      console.error(
        "Error obteniendo tasa de moneda:",
        err
      );
    }
  };

  // --------------------------------------------------
  // GUARDAR PRESUPUESTO
  // --------------------------------------------------

  const handleSaveBudget = async (
    monto_bs: number,
    tipo_tasa: RateType,
    tasa_custom: number
  ) => {
    const updated =
      await apiService.saveBudget(
        monto_bs,
        tipo_tasa,
        tasa_custom
      );

    setBudget(updated);
    await refreshAppData();
    setCurrentScreen("inicio");
  };

  // --------------------------------------------------
  // AGREGAR PRODUCTO (Corregido con parámetro de moneda)
  // --------------------------------------------------

  const handleAddToCart = async (
    name: string,
    price: number,
    quantity: number,
    currency: Currency
  ) => {
    await apiService.addToCart(
      name,
      price,
      quantity,
      currency
    );

    await refreshAppData();
  };

  // --------------------------------------------------
  // ACTUALIZAR CANTIDAD
  // --------------------------------------------------

  const handleUpdateCartQuantity = async (
    id: number,
    quantity: number
  ) => {
    await apiService.updateCartQuantity(
      id,
      quantity
    );

    await refreshAppData();
  };

  // --------------------------------------------------
  // ELIMINAR PRODUCTO
  // --------------------------------------------------

  const handleDeleteCartItem = async (
    id: number
  ) => {
    await apiService.deleteCartItem(id);
    await refreshAppData();
  };

  // --------------------------------------------------
  // CHECKOUT
  // --------------------------------------------------

  const handleCheckout = async () => {
    await apiService.checkout();
    await refreshAppData();
  };

  // --------------------------------------------------
  // ACTUALIZAR TASA
  // --------------------------------------------------

  const handleRefreshExchangeRate = async () => {
    try {
      setIsRefreshingRate(true);
      await apiService.refreshExchangeRate();

      const usdRate =
        await apiService.getExchangeRate("USD");

      setRateInfo(usdRate);

      const selectedRate =
        await apiService.getExchangeRate(
          monedaSeleccionada
        );

      setSelectedRateInfo(selectedRate);
      await refreshAppData();
    } catch (err) {
      console.error(
        "Failed to refresh exchange rate:",
        err
      );
    } finally {
      setIsRefreshingRate(false);
    }
  };

  // --------------------------------------------------
  // TEMA
  // --------------------------------------------------

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const cartCount =
    cartSummary?.total_items || 0;

  const activeSelectedRate =
    budget?.tipo_tasa === "custom"
      ? budget.active_rate
      : selectedRateInfo?.rate ??
        rateInfo?.rate ??
        null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col">

      {/* Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        budget={budget}
        rateInfo={selectedRateInfo ?? rateInfo}
        cartCount={cartCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onRefreshRate={handleRefreshExchangeRate}
        isRefreshingRate={isRefreshingRate}
        monedaSeleccionada={monedaSeleccionada}
        selectedRate={activeSelectedRate}
      />

      {/* Main Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex pb-20 md:pb-6">

        {/* Sidebar */}
        <Navigation
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          cartCount={cartCount}
        />

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">

          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-500">
                Iniciando Rinde+...
              </p>
            </div>
          ) : (
            <>
              {currentScreen === "inicio" && (
                <HomeScreen
                  budget={budget}
                  rateInfo={selectedRateInfo ?? rateInfo}
                  onSaveBudget={handleSaveBudget}
                  onRefreshRate={handleRefreshExchangeRate}
                  isRefreshingRate={isRefreshingRate}
                  monedaSeleccionada={monedaSeleccionada}
                  onChangeCurrency={handleChangeCurrency}
                />
              )}

              {currentScreen === "dashboard" && (
                <DashboardScreen
                  budget={budget}
                  cartSummary={cartSummary}
                  onNavigate={setCurrentScreen}
                />
              )}

              {currentScreen === "agregar" && (
                <AddProductScreen
                  budget={budget}
                  monedaSeleccionada={monedaSeleccionada}
                  selectedRate={activeSelectedRate}
                  onAddToCart={handleAddToCart}
                  onNavigate={setCurrentScreen}
                />
              )}

              {currentScreen === "carrito" && (
                <CartScreen
                  budget={budget}
                  cartSummary={cartSummary}
                  monedaSeleccionada={monedaSeleccionada}
                  selectedRate={activeSelectedRate}
                  onUpdateQuantity={handleUpdateCartQuantity}
                  onDeleteItem={handleDeleteCartItem}
                  onCheckout={handleCheckout}
                  onNavigate={setCurrentScreen}
                />
              )}

              {currentScreen === "historial" && (
                <HistoryScreen
                  history={history}
                />
              )}

              {currentScreen === "comunidad" && (
                <CommunityScreen />
              )}

              {currentScreen === "perfil" && (
                <ProfileScreen
                  budget={budget}
                  rateInfo={selectedRateInfo ?? rateInfo}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={toggleDarkMode}
                  onRefreshRate={handleRefreshExchangeRate}
                  isRefreshingRate={isRefreshingRate}
                  onNavigate={setCurrentScreen}
                />
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}