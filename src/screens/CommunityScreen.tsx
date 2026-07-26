import React, { useState, useEffect } from "react";
import {
  Users,
  PlusCircle,
  Search,
  Filter,
  MapPin,
  Building2,
  Tag,
  DollarSign,
  Award,
  Share2,
  AlertCircle,
  X,
} from "lucide-react";
import { CommunityPrice } from "../types";
import { apiService } from "../services/api";

const VENEZUELA_STATES = [
  "Distrito Capital",
  "Miranda",
  "Zulia",
  "Carabobo",
  "Lara",
  "Aragua",
  "Anzoátegui",
  "Bolívar",
  "Táchira",
  "Mérida",
  "Monagas",
  "Falcón",
  "Sucre",
  "Nueva Esparta",
  "Yaracuy",
  "Barinas",
  "Portuguesa",
  "Trujillo",
  "Guárico",
  "Apure",
  "Cojedes",
  "Delta Amacuro",
  "Amazonas",
  "Vargas (La Guaira)",
];

export const CommunityScreen: React.FC = () => {
  const [prices, setPrices] = useState<CommunityPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchProduct, setSearchProduct] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc">("recent");

  // Share form modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [formProduct, setFormProduct] = useState("");
  const [formPriceUsd, setFormPriceUsd] = useState("");
  const [formSupermarket, setFormSupermarket] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("Distrito Capital");
  const [formUserName, setFormUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPrices = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getCommunityPrices({
        product: searchProduct,
        city: filterCity,
        state: filterState,
        sort: sortBy,
      });
      setPrices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrices();
  }, [searchProduct, filterCity, filterState, sortBy]);

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const priceUsd = parseFloat(formPriceUsd);
    if (!formProduct.trim() || isNaN(priceUsd) || priceUsd <= 0 || !formSupermarket.trim() || !formCity.trim()) {
      setFormError("Por favor completa todos los campos con información válida.");
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
      setShowShareModal(false);
      setFormProduct("");
      setFormPriceUsd("");
      setFormSupermarket("");
      setFormCity("");
      loadPrices();
    } catch (err: any) {
      setFormError(err.message || "Error al publicar precio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Top Banner & Share Price Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-[#2E7D32]" />
            Comunidad de Precios
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Consulta y comparte ofertas reales en supermercados de toda Venezuela
          </p>
        </div>

        <button
          onClick={() => setShowShareModal(true)}
          id="btn-compartir-precio"
          className="px-5 py-3 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-900/10 flex items-center gap-2 shrink-0 transition-all hover:scale-[1.02]"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir Precio</span>
        </button>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Filter className="w-4 h-4 text-[#2E7D32]" />
          <span>Buscar y Filtrar Precios</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Product */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              id="filter-input-product"
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
            />
          </div>

          {/* Filter City */}
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ciudad (Ej: Caracas)..."
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              id="filter-input-city"
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
            />
          </div>

          {/* Filter State Dropdown */}
          <div>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              id="filter-select-state"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
            >
              <option value="">Todos los Estados</option>
              {VENEZUELA_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Order / Sort Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              id="filter-select-sort"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2E7D32] outline-none"
            >
              <option value="recent">Más recientes primero</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shared Price Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 font-medium">
          Cargando ofertas de la comunidad...
        </div>
      ) : prices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <Tag className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No se encontraron precios compartidos
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Sé el primero en compartir un precio de tu supermercado local.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prices.map((item) => (
            <div
              key={item.id}
              className={`p-5 bg-white dark:bg-slate-900 border rounded-3xl shadow-xs relative flex flex-col justify-between space-y-3 transition-all hover:shadow-md ${
                item.is_lowest
                  ? "border-emerald-500/80 dark:border-emerald-500/60 ring-2 ring-emerald-500/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Top Row: Product name & "Más bajo" Badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                  {item.product}
                </h3>

                {item.is_lowest && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950 text-[#2E7D32] dark:text-emerald-300 font-extrabold text-[11px] px-2.5 py-1 rounded-full shrink-0 border border-emerald-200 dark:border-emerald-800">
                    <Award className="w-3.5 h-3.5" />
                    Más bajo
                  </span>
                )}
              </div>

              {/* Price Row */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-[#2E7D32] dark:text-emerald-400">
                    ${item.price_usd.toFixed(2)} <span className="text-xs text-slate-400">USD</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    ≈ Bs {item.price_bs.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block flex items-center justify-end gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {item.supermarket}
                  </span>
                  <span className="text-[11px] text-slate-400 block flex items-center justify-end gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {item.city}, {item.state}
                  </span>
                </div>
              </div>

              {/* Footer row: Contributed user name */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Compartido por: <strong>{item.user_name}</strong></span>
                <span>
                  {new Date(item.created_at).toLocaleDateString("es-VE", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Price Modal Form */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 relative animate-scaleUp">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#2E7D32]" />
                Compartir Precio de Supermercado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ayuda a otros compradores compartiendo ofertas verificadas
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleShareSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Producto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Harina Pan 1kg"
                  value={formProduct}
                  onChange={(e) => setFormProduct(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Precio ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1.15"
                    value={formPriceUsd}
                    onChange={(e) => setFormPriceUsd(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supermercado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Unicasa, Gama..."
                    value={formSupermarket}
                    onChange={(e) => setFormSupermarket(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Caracas"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estado
                  </label>
                  <select
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none"
                  >
                    {VENEZUELA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tu Nombre u Apodo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Comprador Rinde+"
                  value={formUserName}
                  onChange={(e) => setFormUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#2E7D32] hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 mt-2"
              >
                {isSubmitting ? "Publicando..." : "Publicar Precio"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
