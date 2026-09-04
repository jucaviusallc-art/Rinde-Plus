import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Award,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  MapPin,
  Search,
  Share2,
  Store,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  apiService,
  type CommunityPriceGroup,
} from "../services/api";

const VENEZUELA_STATES = [
  "Distrito Capital",
  "Amazonas",
  "Anzoátegui",
  "Apure",
  "Aragua",
  "Barinas",
  "Bolívar",
  "Carabobo",
  "Cojedes",
  "Delta Amacuro",
  "Falcón",
  "Guárico",
  "La Guaira",
  "Lara",
  "Mérida",
  "Miranda",
  "Monagas",
  "Nueva Esparta",
  "Portuguesa",
  "Sucre",
  "Táchira",
  "Trujillo",
  "Yaracuy",
  "Zulia",
];

type CommunitySort = "recent" | "price_asc" | "price_desc";

const COMMUNITY_CITY_STORAGE_KEY = "community_filter_city";
const COMMUNITY_STATE_STORAGE_KEY = "community_filter_state";

function formatUsd(value: number): string {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return safeValue.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatBs(value: number): string {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return safeValue.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string): string {
  if (!value) {
    return "Fecha no disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getGroupKey(group: CommunityPriceGroup, index: number): string {
  return `${group.product}-${index}`;
}

interface CommunityScreenProps {
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  currentUser?: any | null;
}

export const CommunityScreen: React.FC<CommunityScreenProps> = ({
  isAuthenticated,
  onRequireAuth,
  currentUser,
}) => {
  const [groups, setGroups] = useState<CommunityPriceGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [searchProduct, setSearchProduct] = useState("");
  const [filterCity, setFilterCity] = useState(() =>
    window.localStorage.getItem(COMMUNITY_CITY_STORAGE_KEY) ?? ""
  );
  const [filterState, setFilterState] = useState(() =>
    window.localStorage.getItem(COMMUNITY_STATE_STORAGE_KEY) ?? ""
  );
  const [sortBy, setSortBy] = useState<CommunitySort>("recent");

  // Expanded comparison cards
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Share form modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [formProduct, setFormProduct] = useState("");
  const [formPriceUsd, setFormPriceUsd] = useState("");
  const [formSupermarket, setFormSupermarket] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("Distrito Capital");
  const [formUserName, setFormUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(COMMUNITY_CITY_STORAGE_KEY, filterCity);
  }, [filterCity]);

  useEffect(() => {
    window.localStorage.setItem(COMMUNITY_STATE_STORAGE_KEY, filterState);
  }, [filterState]);

  const loadGroups = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await apiService.getCommunityPriceGroups({
        product: searchProduct,
        city: filterCity,
        state: filterState,
        sort: sortBy,
      });

      setGroups(data);
    } catch (error) {
      console.error("Error loading grouped community prices:", error);
      setGroups([]);
      setLoadError(
        "No fue posible cargar los precios de la comunidad. Intenta nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGroups();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchProduct, filterCity, filterState, sortBy]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((currentGroups) => {
      if (currentGroups.includes(groupKey)) {
        return currentGroups.filter((key) => key !== groupKey);
      }

      return [...currentGroups, groupKey];
    });
  };

  const clearFilters = () => {
    setSearchProduct("");
    setFilterCity("");
    setFilterState("");
    setSortBy("recent");
  };

  const closeShareModal = () => {
    if (isSubmitting) {
      return;
    }

    setShowShareModal(false);
    setFormError(null);
  };

  const resetShareForm = () => {
    setFormProduct("");
    setFormPriceUsd("");
    setFormSupermarket("");
    setFormCity("");
    setFormState("Distrito Capital");
    setFormUserName("");
    setFormError(null);
  };

  const handleShareSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const priceUsd = Number.parseFloat(formPriceUsd);

    if (
      !formProduct.trim() ||
      !Number.isFinite(priceUsd) ||
      priceUsd <= 0 ||
      !formSupermarket.trim() ||
      !formCity.trim() ||
      !formState.trim()
    ) {
      setFormError(
        "Por favor completa todos los campos con información válida."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await apiService.sharePrice({
        product: formProduct.trim(),
        price_usd: priceUsd,
        supermarket: formSupermarket.trim(),
        city: formCity.trim(),
        state: formState,
        user_name: formUserName.trim() || "Comprador Rinde+",
      });

      resetShareForm();
      setShowShareModal(false);
      await loadGroups();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al publicar el precio.";

      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lógica de permisos de eliminación alineada con el backend
  const userEmail = currentUser?.email?.toLowerCase() || "";
  const userId = currentUser?.id || "";
  const ADMIN_EMAIL = "jucaviusallc@gmail.com";
  const isAdmin = userEmail === ADMIN_EMAIL.toLowerCase();

  const handleDeleteOffer = async (offerId: number) => {
    if (!confirm("¿Deseas eliminar este precio de la comunidad?")) {
      return;
    }

    try {
      await apiService.deleteCommunityPrice(offerId);
      await loadGroups();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar el precio."
      );
    }
  };

  const totalReports = groups.reduce(
    (total, group) => total + Number(group.reports || 0),
    0
  );

  const totalSupermarkets = groups.reduce(
    (total, group) => total + Number(group.supermarkets || 0),
    0
  );

  const hasActiveFilters =
    Boolean(searchProduct.trim()) ||
    Boolean(filterCity.trim()) ||
    Boolean(filterState) ||
    sortBy !== "recent";

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-[#2E7D32]" />
            Comunidad de Precios
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compara precios reales reportados en supermercados de Venezuela
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth();
              return;
            }

            setShowShareModal(true);
          }}
          id="btn-compartir-precio"
          className="px-5 py-3 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 shrink-0 transition-all hover:scale-[1.02]"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir precio</span>
        </button>
      </section>

      {/* Community summary */}
      {!isLoading && groups.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
              <Tag className="w-5 h-5 text-[#2E7D32] dark:text-emerald-400" />
            </div>

            <div>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {groups.length}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Productos comparados
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {totalReports}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Reportes encontrados
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>

            <div>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {totalSupermarkets}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Supermercados comparados
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Filter className="w-4 h-4 text-[#2E7D32]" />
            <span>Buscar y filtrar precios</span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-[#2E7D32] dark:text-emerald-400 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchProduct}
              onChange={(event) => setSearchProduct(event.target.value)}
              id="filter-input-product"
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

            <input
              type="text"
              placeholder="Ciudad, por ejemplo Caracas"
              value={filterCity}
              onChange={(event) => setFilterCity(event.target.value)}
              id="filter-input-city"
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
            />
          </div>

          <select
            value={filterState}
            onChange={(event) => setFilterState(event.target.value)}
            id="filter-select-state"
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
          >
            <option value="">Todos los estados</option>

            {VENEZUELA_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as CommunitySort)
            }
            id="filter-select-sort"
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
          >
            <option value="recent">Más recientes primero</option>
            <option value="price_asc">Menor precio primero</option>
            <option value="price_desc">Mayor precio primero</option>
          </select>
        </div>
      </section>

      {/* Loading state */}
      {isLoading && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-4 border-slate-200 dark:border-slate-700 border-t-[#2E7D32] rounded-full animate-spin" />

          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Comparando precios de la comunidad...
          </p>

          <p className="text-xs text-slate-400 mt-1">
            Buscando las mejores ofertas disponibles
          </p>
        </section>
      )}

      {/* Error state */}
      {!isLoading && loadError && (
        <section className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />

              <div>
                <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                  No pudimos cargar la comunidad
                </h3>

                <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                  {loadError}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadGroups()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
            >
              Reintentar
            </button>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && !loadError && groups.length === 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Tag className="w-7 h-7 text-slate-400" />
          </div>

          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No se encontraron precios para comparar
          </h3>

          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cambia los filtros o comparte el primer precio disponible para ese
            producto.
          </p>

          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                onRequireAuth();
                return;
              }

              setShowShareModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2E7D32] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl"
          >
            <Share2 className="w-4 h-4" />
            Compartir un precio
          </button>
        </section>
      )}

      {/* Product comparison groups */}
      {!isLoading && !loadError && groups.length > 0 && (
        <section className="space-y-5">
          {groups.map((group, groupIndex) => {
            const groupKey = getGroupKey(group, groupIndex);
            const isExpanded = expandedGroups.includes(groupKey);
            const offers = Array.isArray(group.offers)
              ? [...group.offers].sort(
                  (firstOffer, secondOffer) =>
                    Number(firstOffer.price_usd) -
                    Number(secondOffer.price_usd)
                )
              : [];

            const visibleOffers = isExpanded
              ? offers
              : offers.slice(0, 3);

            const cheapestOffer = offers[0];
            const hiddenOffersCount = Math.max(
              offers.length - visibleOffers.length,
              0
            );

            return (
              <article
                key={groupKey}
                className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs"
              >
                {/* Product header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                          {group.product}
                        </h2>

                        {offers.length > 1 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                            <Award className="w-3 h-3" />
                            Comparación activa
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {group.reports}{" "}
                          {group.reports === 1 ? "reporte" : "reportes"}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5" />
                          {group.supermarkets}{" "}
                          {group.supermarkets === 1
                            ? "supermercado"
                            : "supermercados"}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="w-3.5 h-3.5" />
                          Actualizado {formatDate(group.latest_report_at)}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 lg:text-right">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Mejor precio
                      </p>

                      <p className="text-3xl font-black text-[#2E7D32] dark:text-emerald-400 mt-0.5">
                        ${formatUsd(group.lowest_price_usd)}
                      </p>

                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ≈ Bs {formatBs(group.lowest_price_bs)}
                      </p>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 p-3.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Precio mínimo
                      </p>

                      <p className="text-lg font-black text-emerald-800 dark:text-emerald-300 mt-1">
                        ${formatUsd(group.lowest_price_usd)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Precio promedio
                      </p>

                      <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">
                        ${formatUsd(group.average_price_usd)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Precio máximo
                      </p>

                      <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">
                        ${formatUsd(group.highest_price_usd)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Offers */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#2E7D32]" />

                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Ofertas ordenadas por precio
                      </h3>
                    </div>

                    <span className="text-[11px] font-bold text-slate-400">
                      {offers.length}{" "}
                      {offers.length === 1 ? "oferta" : "ofertas"}
                    </span>
                  </div>

                  {offers.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 text-center">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        No hay ofertas disponibles dentro de este grupo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleOffers.map((offer, offerIndex) => {
                        const isLowest =
                          Boolean(offer.is_lowest) || offerIndex === 0;

                        // Validación de propiedad y administrador para mostrar el botón
                        const isOwner =
                          offer.auth_user_id &&
                          userId &&
                          String(offer.auth_user_id) === String(userId);
                        const canDelete = currentUser && (isAdmin || isOwner);

                        return (
                          <div
                            key={`${offer.id}-${offerIndex}`}
                            className={`rounded-2xl border p-4 transition-all ${
                              isLowest
                                ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-200 dark:ring-emerald-900"
                                : "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black text-slate-900 dark:text-white">
                                    {offer.supermarket}
                                  </p>

                                  {isLowest && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2E7D32] text-white text-[9px] font-extrabold uppercase tracking-wide">
                                      <Award className="w-3 h-3" />
                                      Más barato
                                    </span>
                                  )}
                                </div>

                                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {offer.city}, {offer.state}
                                  </span>
                                </p>

                                <p className="text-[10px] text-slate-400 mt-2">
                                  Compartido por{" "}
                                  <strong className="font-bold text-slate-500 dark:text-slate-300">
                                    {offer.user_name || "Comprador Rinde+"}
                                  </strong>{" "}
                                  · {formatDate(offer.created_at)}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                <div className="sm:text-right">
                                  <p
                                    className={`text-2xl font-black ${
                                      isLowest
                                        ? "text-[#2E7D32] dark:text-emerald-400"
                                        : "text-slate-900 dark:text-white"
                                    }`}
                                  >
                                    ${formatUsd(offer.price_usd)}
                                  </p>

                                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    ≈ Bs {formatBs(offer.price_bs)}
                                  </p>
                                </div>

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOffer(offer.id)}
                                    className="p-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition-colors"
                                    title="Eliminar este precio"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {offers.length > 3 && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full mt-4 py-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Mostrar menos ofertas
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver {hiddenOffersCount}{" "}
                          {hiddenOffersCount === 1
                            ? "oferta adicional"
                            : "ofertas adicionales"}
                        </>
                      )}
                    </button>
                  )}

                  {cheapestOffer && offers.length > 1 && (
                    <p className="text-[10px] text-center text-slate-400 mt-4">
                      La mejor oferta aparece primero. Los precios son
                      compartidos por miembros de la comunidad.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Share price modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeShareModal();
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl space-y-5 relative animate-scaleUp">
            <button
              type="button"
              onClick={closeShareModal}
              disabled={isSubmitting}
              aria-label="Cerrar formulario"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pr-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#2E7D32]" />
                Compartir precio
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ayuda a otros compradores compartiendo un precio real de tu
                supermercado.
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleShareSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="community-form-product"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Producto
                </label>

                <input
                  id="community-form-product"
                  type="text"
                  placeholder="Ej: Harina P.A.N. 1 kg"
                  value={formProduct}
                  onChange={(event) => setFormProduct(event.target.value)}
                  required
                  maxLength={120}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="community-form-price"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Precio en USD
                  </label>

                  <input
                    id="community-form-price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="1.15"
                    value={formPriceUsd}
                    onChange={(event) => setFormPriceUsd(event.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="community-form-supermarket"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Supermercado
                  </label>

                  <input
                    id="community-form-supermarket"
                    type="text"
                    placeholder="Ej: Unicasa"
                    value={formSupermarket}
                    onChange={(event) =>
                      setFormSupermarket(event.target.value)
                    }
                    required
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="community-form-city"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Ciudad
                  </label>

                  <input
                    id="community-form-city"
                    type="text"
                    placeholder="Ej: Caracas"
                    value={formCity}
                    onChange={(event) => setFormCity(event.target.value)}
                    required
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="community-form-state"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Estado
                  </label>

                  <select
                    id="community-form-state"
                    value={formState}
                    onChange={(event) => setFormState(event.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                  >
                    {VENEZUELA_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="community-form-user"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Tu nombre o apodo
                  <span className="font-medium text-slate-400">
                    {" "}
                    (opcional)
                  </span>
                </label>

                <input
                  id="community-form-user"
                  type="text"
                  placeholder="Comprador Rinde+"
                  value={formUserName}
                  onChange={(event) => setFormUserName(event.target.value)}
                  maxLength={80}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeShareModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex-1 py-3 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Publicar precio
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};