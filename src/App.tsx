import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import {
  ScreenName,
  Budget,
  CartSummary,
  HistoryRecord,
  ExchangeRateInfo,
  RateType,
} from "./types";

import { apiService } from "./services/api";
import { getCurrentUser } from "./services/auth";
import { Header } from "./components/Header";
import { Navigation } from "./components/Navigation";

import { HomeScreen } from "./screens/HomeScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { AddProductScreen } from "./screens/AddProductScreen";
import { CartScreen } from "./screens/CartScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { CommunityScreen } from "./screens/CommunityScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

type Currency = "USD" | "EUR";

export default function App() {
  // --------------------------------------------------
  // PANTALLA ACTUAL
  // --------------------------------------------------

  const [currentScreen, setCurrentScreen] =
    useState<ScreenName>("inicio");

  // --------------------------------------------------
  // DATOS PRINCIPALES
  // --------------------------------------------------

  const [budget, setBudget] =
    useState<Budget | null>(null);

  const [cartSummary, setCartSummary] =
    useState<CartSummary | null>(null);

  const [rateInfo, setRateInfo] =
    useState<ExchangeRateInfo | null>(null);

  const [history, setHistory] =
    useState<HistoryRecord[]>([]);

  // --------------------------------------------------
  // MONEDA SELECCIONADA
  // --------------------------------------------------

  const [monedaSeleccionada, setMonedaSeleccionada] =
    useState<Currency>(() => {
      const savedCurrency =
        localStorage.getItem("rinde_currency");

      return savedCurrency === "EUR"
        ? "EUR"
        : "USD";
    });

  const [selectedRateInfo, setSelectedRateInfo] =
    useState<ExchangeRateInfo | null>(null);

  // --------------------------------------------------
  // TEMA
  // --------------------------------------------------

  const [isDarkMode, setIsDarkMode] =
    useState<boolean>(() => {
      const savedTheme =
        localStorage.getItem("rinde_theme");

      if (savedTheme) {
        return savedTheme === "dark";
      }

      return window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
    });

  // --------------------------------------------------
  // ESTADOS DE CARGA
  // --------------------------------------------------

  const [isRefreshingRate, setIsRefreshingRate] =
    useState<boolean>(false);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

const [currentUser, setCurrentUser] =
  useState<Awaited<ReturnType<typeof getCurrentUser>>>(null);

useEffect(() => {
  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error obteniendo usuario actual:", error);
    }
  };

  loadCurrentUser();
}, []);
const handleAuthSuccess = async () => {
  const user = await getCurrentUser();
  setCurrentUser(user);
};
  // --------------------------------------------------
  // REFS PARA EVITAR RESPUESTAS ANTIGUAS
  // --------------------------------------------------

  const monedaRef =
    useRef<Currency>(monedaSeleccionada);

  const currencyRequestRef =
    useRef(0);

  useEffect(() => {
    monedaRef.current =
      monedaSeleccionada;
  }, [monedaSeleccionada]);

  // --------------------------------------------------
  // TEMA CLARO / OSCURO
  // --------------------------------------------------

  useEffect(() => {
    const root =
      document.documentElement;

    if (isDarkMode) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";

      localStorage.setItem(
        "rinde_theme",
        "dark"
      );
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";

      localStorage.setItem(
        "rinde_theme",
        "light"
      );
    }
  }, [isDarkMode]);

  // --------------------------------------------------
  // CARGAR DATOS
  // --------------------------------------------------

  const refreshAppData = useCallback(
    async (
      currency: Currency = monedaRef.current
    ) => {
      try {
        const [
          bData,
          cData,
          usdData,
          hData,
          selectedData,
        ] = await Promise.all([
          apiService.getBudget(),

          apiService.getCart(),

          apiService.getExchangeRate(
            "USD"
          ),

          apiService.getHistory(),

          apiService.getExchangeRate(
            currency
          ),
        ]);

        setBudget(bData);
        setCartSummary(cData);
        setRateInfo(usdData);
        setHistory(hData);

        if (
          monedaRef.current === currency
        ) {
          setSelectedRateInfo(
            selectedData
          );
        }
      } catch (err) {
        console.error(
          "Error loading app data:",
          err
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // --------------------------------------------------
  // INICIALIZACIÓN
  // --------------------------------------------------

  const initializeApp =
    useCallback(async () => {
      setIsLoading(true);

      const initialCurrency =
        monedaRef.current;

      await refreshAppData(
        initialCurrency
      );

      setIsRefreshingRate(true);

      try {
        await apiService.refreshExchangeRate();

        const currencyAfterRefresh =
          monedaRef.current;

        const [
          usdRate,
          selectedRate,
        ] = await Promise.all([
          apiService.getExchangeRate(
            "USD"
          ),

          apiService.getExchangeRate(
            currencyAfterRefresh
          ),
        ]);

        setRateInfo(
          usdRate
        );

        if (
          monedaRef.current ===
          currencyAfterRefresh
        ) {
          setSelectedRateInfo(
            selectedRate
          );
        }
      } catch (err) {
        console.error(
          "Could not automatically refresh the exchange rates:",
          err
        );
      } finally {
        setIsRefreshingRate(
          false
        );
      }
    }, [refreshAppData]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // --------------------------------------------------
  // CAMBIO DE MONEDA
  // --------------------------------------------------

  const handleChangeCurrency =
    async (
      currency: Currency
    ) => {
      const requestId =
        ++currencyRequestRef.current;

      monedaRef.current =
        currency;

      setMonedaSeleccionada(
        currency
      );

      localStorage.setItem(
        "rinde_currency",
        currency
      );

      try {
        const newRate =
          await apiService.getExchangeRate(
            currency
          );

        if (
          requestId !==
            currencyRequestRef.current ||
          monedaRef.current !== currency
        ) {
          return;
        }

        setSelectedRateInfo(
          newRate
        );

        await refreshAppData(
          currency
        );
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

  const handleSaveBudget =
    async (
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

      // Actualizar inmediatamente el presupuesto
      setBudget(updated);

      // Ir inmediatamente a Control
      setCurrentScreen(
        "dashboard"
      );

      // Actualizar los demás datos
      // sin bloquear la navegación
      await refreshAppData(
        monedaRef.current
      );
    };

  // --------------------------------------------------
  // AGREGAR PRODUCTO
  // --------------------------------------------------

  const handleAddToCart =
    async (
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

      await refreshAppData(
        monedaRef.current
      );
    };

  // --------------------------------------------------
  // ACTUALIZAR CANTIDAD
  // --------------------------------------------------

  const handleUpdateCartQuantity =
    async (
      id: number,
      quantity: number
    ) => {
      await apiService.updateCartQuantity(
        id,
        quantity
      );

      await refreshAppData(
        monedaRef.current
      );
    };

  // --------------------------------------------------
  // ELIMINAR PRODUCTO
  // --------------------------------------------------

  const handleDeleteCartItem =
    async (
      id: number
    ) => {
      await apiService.deleteCartItem(
        id
      );

      await refreshAppData(
        monedaRef.current
      );
    };

  // --------------------------------------------------
  // CHECKOUT
  // --------------------------------------------------

  const handleCheckout =
    async () => {
      await apiService.checkout();

      await refreshAppData(
        monedaRef.current
      );
    };
// --------------------------------------------------
  // ELIMINAR REGISTRO DEL HISTORIAL
  // --------------------------------------------------

  const handleDeleteHistoryItem = async (id: number) => {
    try {
      await apiService.deleteHistoryItem(id);
      await refreshAppData(monedaRef.current);
    } catch (err) {
      console.error("Error al eliminar el registro del historial:", err);
      alert("No fue posible eliminar el registro. Intenta nuevamente.");
    }
  };

  // --------------------------------------------------
  // VACIAR TODO EL HISTORIAL
  // --------------------------------------------------

  const handleClearHistory = async () => {
    try {
      await apiService.clearHistory();
      await refreshAppData(monedaRef.current);
    } catch (err) {
      console.error("Error al vaciar el historial:", err);
      alert("No fue posible vaciar el historial. Intenta nuevamente.");
    }
  };
  // --------------------------------------------------
  // ACTUALIZAR TASAS MANUALMENTE
  // --------------------------------------------------

  const handleRefreshExchangeRate =
    async () => {
      const requestId =
        ++currencyRequestRef.current;

      try {
        setIsRefreshingRate(
          true
        );

        await apiService.refreshExchangeRate();

        const currentCurrency =
          monedaRef.current;

        const [
          usdRate,
          selectedRate,
        ] = await Promise.all([
          apiService.getExchangeRate(
            "USD"
          ),

          apiService.getExchangeRate(
            currentCurrency
          ),
        ]);

        setRateInfo(
          usdRate
        );

        if (
          requestId ===
            currencyRequestRef.current &&
          monedaRef.current ===
            currentCurrency
        ) {
          setSelectedRateInfo(
            selectedRate
          );
        }

        await refreshAppData(
          currentCurrency
        );
      } catch (err) {
        console.error(
          "Failed to refresh exchange rates:",
          err
        );
      } finally {
        setIsRefreshingRate(
          false
        );
      }
    };

  // --------------------------------------------------
  // TEMA
  // --------------------------------------------------

  const toggleDarkMode =
    () => {
      setIsDarkMode(
        (prev) => !prev
      );
    };

  // --------------------------------------------------
  // CONTADOR DEL CARRITO
  // --------------------------------------------------

  const cartCount =
    cartSummary?.total_items ||
    0;

  // --------------------------------------------------
  // TASAS ACTIVAS
  // AISLAMIENTO ESTRICTO EUR / USD
  // --------------------------------------------------

  /*
   * 1. activeSelectedRate:
   *
   * Si es EUR:
   * utiliza estrictamente la tasa EUR.
   *
   * Si es USD:
   * permite tasa custom o USD oficial.
   */

  const activeSelectedRate =
    monedaSeleccionada === "EUR"
      ? selectedRateInfo?.rate ?? null
      : budget?.tipo_tasa === "custom" &&
        budget.active_rate != null
        ? budget.active_rate
        : selectedRateInfo?.rate ??
          rateInfo?.rate ??
          null;

  /*
   * 2. activeRateInfo:
   *
   * Si es EUR:
   * devuelve únicamente selectedRateInfo.
   *
   * Si es USD:
   * permite respaldo entre selectedRateInfo
   * y rateInfo.
   */

  const activeRateInfo =
    monedaSeleccionada === "EUR"
      ? selectedRateInfo
      : selectedRateInfo ??
        rateInfo;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col">

      {/* HEADER */}

      <Header
        currentScreen={
          currentScreen
        }
        onNavigate={
          setCurrentScreen
        }
        budget={
          budget
        }
        rateInfo={
          activeRateInfo
        }
        cartCount={
          cartCount
        }
        isDarkMode={
          isDarkMode
        }
        onToggleDarkMode={
          toggleDarkMode
        }
        onRefreshRate={
          handleRefreshExchangeRate
        }
        isRefreshingRate={
          isRefreshingRate
        }
        monedaSeleccionada={
          monedaSeleccionada
        }
        selectedRate={
          activeSelectedRate
        }
      />

      {/* LAYOUT PRINCIPAL */}

      <div className="flex-1 max-w-7xl w-full mx-auto flex pb-20 md:pb-6">

        {/* SIDEBAR */}

        <Navigation
          currentScreen={
            currentScreen
          }
          onNavigate={
            setCurrentScreen
          }
          cartCount={
            cartCount
          }
        />

        {/* CONTENIDO */}

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

              {/* INICIO */}

              {currentScreen ===
                "inicio" && (
                <HomeScreen
                  budget={
                    budget
                  }
                  rateInfo={
                    activeRateInfo
                  }
                  onSaveBudget={
                    handleSaveBudget
                  }
                  onRefreshRate={
                    handleRefreshExchangeRate
                  }
                  isRefreshingRate={
                    isRefreshingRate
                  }
                  monedaSeleccionada={
                    monedaSeleccionada
                  }
                  onChangeCurrency={
                    handleChangeCurrency
                  }
                />
              )}

              {/* DASHBOARD / CONTROL */}

              {currentScreen ===
                "dashboard" && (
                <DashboardScreen
                  budget={
                    budget
                  }
                  cartSummary={
                    cartSummary
                  }
                  monedaSeleccionada={
                    monedaSeleccionada
                  }
                  selectedRate={
                    activeSelectedRate
                  }
                  onNavigate={
                    setCurrentScreen
                  }
                />
              )}

              {/* AGREGAR PRODUCTO */}

              {currentScreen ===
                "agregar" && (
                <AddProductScreen
                  budget={
                    budget
                  }
                  monedaSeleccionada={
                    monedaSeleccionada
                  }
                  selectedRate={
                    activeSelectedRate
                  }
                  onAddToCart={
                    handleAddToCart
                  }
                  onNavigate={
                    setCurrentScreen
                  }
                />
              )}

              {/* CARRITO */}

              {currentScreen ===
                "carrito" && (
                <CartScreen
                  budget={
                    budget
                  }
                  cartSummary={
                    cartSummary
                  }
                  monedaSeleccionada={
                    monedaSeleccionada
                  }
                  selectedRate={
                    activeSelectedRate
                  }
                  onUpdateQuantity={
                    handleUpdateCartQuantity
                  }
                  onDeleteItem={
                    handleDeleteCartItem
                  }
                  onCheckout={
                    handleCheckout
                  }
                  onNavigate={
                    setCurrentScreen
                  }
                />
              )}

              {/* HISTORIAL */}

                            {currentScreen ===
                              "historial" && (
                              <HistoryScreen
                                history={
                                  history
                                }
                                onDeleteHistoryItem={
                                  handleDeleteHistoryItem
                                }
                                onClearHistory={
                                  handleClearHistory
                                }
                              />
                            )}

              {/* COMUNIDAD */}

              {currentScreen ===
                "comunidad" && (
                <CommunityScreen
  isAuthenticated={!!currentUser}
  onRequireAuth={() => setCurrentScreen("auth")}
/>
              )}
{/* AUTENTICACIÓN */}

{currentScreen === "auth" && (
  <AuthScreen
    onLoginSuccess={async () => {
      await handleAuthSuccess();
      setCurrentScreen("comunidad");
    }}
  />
)}
              {/* PERFIL */}

              {currentScreen ===
                "perfil" && (
                <ProfileScreen
                  budget={
                    budget
                  }
                  rateInfo={
                    activeRateInfo
                  }
                  isDarkMode={
                    isDarkMode
                  }
                  onToggleDarkMode={
                    toggleDarkMode
                  }
                  onRefreshRate={
                    handleRefreshExchangeRate
                  }
                  isRefreshingRate={
                    isRefreshingRate
                  }
                  onNavigate={
                    setCurrentScreen
                  }
                />
              )}

            </>
          )}

        </main>
      </div>
    </div>
  );
}