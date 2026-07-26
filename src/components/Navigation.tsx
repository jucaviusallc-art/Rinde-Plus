import React from "react";
import {
  Home,
  LayoutDashboard,
  PlusCircle,
  ShoppingCart,
  History,
  Users,
  User,
} from "lucide-react";
import { ScreenName } from "../types";

interface NavigationProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
  cartCount: number;
}

interface NavItem {
  id: ScreenName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  cartCount,
}) => {
  const navItems: NavItem[] = [
    { id: "inicio", label: "Inicio", icon: Home },
    { id: "dashboard", label: "Control", icon: LayoutDashboard },
    { id: "agregar", label: "Agregar", icon: PlusCircle },
    { id: "carrito", label: "Carrito", icon: ShoppingCart, badge: cartCount },
    { id: "historial", label: "Historial", icon: History },
    { id: "comunidad", label: "Comunidad", icon: Users },
    { id: "perfil", label: "Perfil", icon: User },
  ];

  return (
    <>
      {/* Desktop Sidebar (visible on md screens and up) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 min-h-[calc(100vh-4rem)]">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-3">
          Navegación Rinde+
        </div>
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                id={`sidebar-nav-${item.id}`}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#2E7D32] text-white shadow-md shadow-emerald-900/10"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  <span>{item.label === "Control" ? "Control de Compra" : item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? "bg-white text-[#2E7D32]"
                        : "bg-emerald-100 dark:bg-emerald-950/80 text-[#2E7D32] dark:text-emerald-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick App info footer */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400 dark:text-slate-500 px-3">
          <p className="font-semibold text-slate-600 dark:text-slate-400">Rinde+ v1.2.0</p>
          <p className="mt-0.5">Tasa oficial BCV sincronizada en tiempo real.</p>
        </div>
      </aside>

      {/* Mobile Floating Bottom Navigation Pill (visible on mobile only) */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <nav className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-lg border border-slate-800 rounded-2xl shadow-2xl px-2 py-2 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                id={`mobile-nav-${item.id}`}
                className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? "text-emerald-400 font-bold bg-slate-800/90"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 bg-emerald-400 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
