import React from "react";
import {
  User,
  Mail,
  Sun,
  Moon,
  Info,
  LogOut,
  Settings,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Budget, ExchangeRateInfo, ScreenName } from "../types";

interface ProfileScreenProps {
  budget: Budget | null;
  rateInfo: ExchangeRateInfo | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onRefreshRate: () => void;
  isRefreshingRate: boolean;
  onNavigate: (screen: ScreenName) => void;
  currentUser?: any | null; // <-- Prop para evaluar el usuario actual
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  budget,
  rateInfo,
  isDarkMode,
  onToggleDarkMode,
  onRefreshRate,
  isRefreshingRate,
  onNavigate,
  currentUser,
}) => {
  const activeRate = budget?.active_rate || rateInfo?.rate || 72.5;

  // Verificamos si hay un usuario autenticado y con correo verificado
  const isLoggedIn = Boolean(currentUser);
  const isVerified = Boolean(currentUser?.email_confirmed_at || currentUser?.confirmed_at);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <User className="w-7 h-7 text-[#2E7D32]" />
          Perfil y Configuración
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Gestiona tus preferencias de usuario, apariencia y tasa de cambio
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2E7D32] to-emerald-500 text-white font-black text-2xl flex items-center justify-center shadow-md">
          {isLoggedIn && currentUser?.email ? currentUser.email.substring(0, 2).toUpperCase() : "CR"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Comprador Rinde+
            </h2>

            {isLoggedIn && isVerified ? (
              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Verificado
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-bold">
                {isLoggedIn ? "Cuenta no verificada" : "Cuenta no registrada"}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
            <Mail className="w-4 h-4 text-slate-400" />
            {isLoggedIn && currentUser?.email ? currentUser.email : "Regístrate para verificar tu cuenta"}
          </p>
        </div>
      </div>

      {/* Theme & Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#2E7D32]" />
          Ajustes de la Aplicación
        </h3>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-xs">
              {isDarkMode ? (
                <Moon className="w-5 h-5 text-amber-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div>
              <span className="block font-bold text-slate-900 dark:text-white text-sm">
                Modo Visual
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isDarkMode ? "Tema Oscuro activado" : "Tema Claro activado"}
              </span>
            </div>
          </div>

          <button
            onClick={onToggleDarkMode}
            id="btn-profile-toggle-theme"
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl transition-colors"
          >
            Cambiar Tema
          </button>
        </div>

        {/* Active Rate Settings */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white dark:bg-slate-700 text-[#2E7D32] dark:text-emerald-400 rounded-xl shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-bold text-slate-900 dark:text-white text-sm">
                Tasa Activa ({budget?.tipo_tasa === "custom" ? "Personalizada" : "BCV"})
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                1 USD = <strong>Bs {activeRate.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate("inicio")}
            id="btn-profile-change-rate"
            className="px-4 py-2 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Cambiar Tasa
          </button>
        </div>
      </div>

      {/* App Version & Credits */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-[#2E7D32]" />
          Información del Sistema
        </h3>

        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span>Versión de la App:</span>
            <strong className="text-slate-900 dark:text-white">Rinde+ v1.2.0 (React 19)</strong>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span>Fuente de Cambio:</span>
            <strong className="text-[#2E7D32] dark:text-emerald-400">
              {rateInfo?.source || "Banco Central de Venezuela (BCV)"}
            </strong>
          </div>
          <div className="flex justify-between py-1.5">
            <span>Estado del Servidor:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> En Línea
            </span>
          </div>
        </div>
      </div>

      {/* Logout / Reset Button */}
      <button
        onClick={() => {
          if (confirm("¿Deseas reiniciar tu sesión de presupuesto Rinde+?")) {
            onNavigate("inicio");
          }
        }}
        id="btn-cerrar-sesion"
        className="w-full py-3.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-sm rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        <span>Cerrar sesión / Reiniciar</span>
      </button>
    </div>
  );
};