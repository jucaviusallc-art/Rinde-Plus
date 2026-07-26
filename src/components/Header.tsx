import React from "react";
import {
  RefreshCw,
  Sun,
  Moon,
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { Budget, ExchangeRateInfo, ScreenName } from "../types";

interface HeaderProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
  budget: Budget | null;
  rateInfo: ExchangeRateInfo | null;
  cartCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onRefreshRate: () => void;
  isRefreshingRate: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  budget,
  rateInfo,
  cartCount,
  isDarkMode,
  onToggleDarkMode,
  onRefreshRate,
  isRefreshingRate,
}) => {
  const activeRate = budget?.active_rate || rateInfo?.rate || 72.5;
  const isCustomRate = budget?.tipo_tasa === "custom";

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-emerald-100 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-2 cursor-pointer group"
          id="header-brand-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
            R
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center">
              Rinde<span className="text-[#2E7D32] text-2xl font-black ml-0.5">+</span>
            </div>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 -mt-1 hidden sm:block">
              Presupuesto en Tiempo Real 🇻🇪
            </p>
          </div>
        </div>

        {/* BCV Rate Indicator Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-slate-800/80 border border-emerald-200/60 dark:border-slate-700/60 rounded-full px-3 py-1.5 shadow-xs">
            <TrendingUp className="w-4 h-4 text-[#2E7D32] dark:text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-500 dark:text-slate-400 mr-1 hidden xs:inline">
                {isCustomRate ? "Tasa Manual:" : "BCV Oficial:"}
              </span>
              <span className="font-bold text-slate-900 dark:text-emerald-300">
                Bs {activeRate.toFixed(2)}
              </span>
            </div>
            {!isCustomRate && (
              <button
                onClick={onRefreshRate}
                disabled={isRefreshingRate}
                title="Actualizar tasa desde BCV"
                className="p-1 text-slate-500 hover:text-[#2E7D32] dark:text-slate-400 dark:hover:text-emerald-300 transition-colors rounded-full hover:bg-emerald-100/50 dark:hover:bg-slate-700"
                id="header-refresh-bcv-btn"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isRefreshingRate ? "animate-spin text-[#2E7D32]" : ""
                  }`}
                />
              </button>
            )}
            {isCustomRate && (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-md font-semibold">
                Personalizada
              </span>
            )}
          </div>

          {/* Cart Icon Quick Action */}
          <button
            onClick={() => onNavigate("carrito")}
            className={`relative p-2.5 rounded-xl border transition-all ${
              currentScreen === "carrito"
                ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
            title="Ver Carrito"
            id="header-cart-btn"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900 animate-pulse">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            id="header-theme-toggle-btn"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
