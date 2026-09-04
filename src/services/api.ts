import { supabase } from "./supabase";

import {
  Budget,
  CartSummary,
  HistoryRecord,
  CommunityPrice,
  ExchangeRateInfo,
  RateType,
} from "../types";

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://rinde-plus.onrender.com";

const API_BASE =
  `${BASE_URL.replace(/\/$/, "")}/app-api`;

const USER_ID_STORAGE_KEY =
  "rinde_plus_user_id";

const DOLAR_API_BASE =
  "https://ve.dolarapi.com/v1";

export type Currency = "USD" | "EUR";

export interface CommunityPriceOffer
  extends CommunityPrice {
  is_lowest: boolean;
}

export interface CommunityPriceGroup {
  product: string;
  lowest_price_usd: number;
  highest_price_usd: number;
  average_price_usd: number;
  lowest_price_bs: number;
  highest_price_bs: number;
  average_price_bs: number;
  reports: number;
  supermarkets: number;
  latest_report_at: string;
  offers: CommunityPriceOffer[];
}

export interface CommunityPriceFilters {
  product?: string;
  city?: string;
  state?: string;
  sort?: "recent" | "price_asc" | "price_desc";
}

// --------------------------------------------------
// USUARIO
// --------------------------------------------------

function createUserId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `rinde_user_${crypto.randomUUID()}`;
  }

  return `rinde_user_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function getUserId(): string {
  const existingUserId =
    localStorage.getItem(
      USER_ID_STORAGE_KEY
    );

  if (existingUserId) {
    return existingUserId;
  }

  const newUserId = createUserId();

  localStorage.setItem(
    USER_ID_STORAGE_KEY,
    newUserId
  );

  return newUserId;
}

function getUserHeaders(
  includeJsonContentType = false
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-User-ID": getUserId(),
  };

  if (includeJsonContentType) {
    headers["Content-Type"] =
      "application/json";
  }

  return headers;
}

// --------------------------------------------------
// COMUNIDAD
// --------------------------------------------------

function buildCommunityQuery(
  filters?: CommunityPriceFilters
): string {
  const params = new URLSearchParams();

  if (filters?.product?.trim()) {
    params.set(
      "product",
      filters.product.trim()
    );
  }

  if (filters?.city?.trim()) {
    params.set(
      "city",
      filters.city.trim()
    );
  }

  if (filters?.state?.trim()) {
    params.set(
      "state",
      filters.state.trim()
    );
  }

  if (filters?.sort) {
    params.set(
      "sort",
      filters.sort
    );
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

// --------------------------------------------------
// NORMALIZAR RESPUESTA DOLARAPI
// --------------------------------------------------

function normalizeDolarApiRate(
  data: any,
  currency: Currency
): ExchangeRateInfo {
  if (!data || typeof data !== "object") {
    throw new Error(
      `Respuesta inválida de DolarApi para ${currency}`
    );
  }

  const rate = Number(data.promedio);

  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    throw new Error(
      `DolarApi devolvió una tasa inválida para ${currency}`
    );
  }

  const expectedCurrency =
    currency === "USD"
      ? "USD"
      : "EUR";

  if (
    data.moneda &&
    String(data.moneda).toUpperCase() !==
      expectedCurrency
  ) {
    throw new Error(
      `DolarApi devolvió ${data.moneda} cuando se esperaba ${expectedCurrency}`
    );
  }

  return {
    rate,
    date:
      data.fechaActualizacion ||
      new Date()
        .toISOString()
        .split("T")[0],

    source:
      data.fuente
        ? `DolarApi - ${data.fuente}`
        : "DolarApi - BCV",

    ...(data.fechaActualizacion
      ? {
          last_updated:
            data.fechaActualizacion,
        }
      : {}),
  };
}

// --------------------------------------------------
// OBTENER TASA DIRECTAMENTE DESDE DOLARAPI
// --------------------------------------------------

async function fetchDolarApiRate(
  currency: Currency
): Promise<ExchangeRateInfo> {
  const endpoint =
    currency === "EUR"
      ? `${DOLAR_API_BASE}/euros/oficial`
      : `${DOLAR_API_BASE}/dolares/oficial`;

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `DolarApi HTTP ${res.status} para ${currency}`
    );
  }

  const data = await res.json();

  return normalizeDolarApiRate(
    data,
    currency
  );
}

// --------------------------------------------------
// SERVICIO API
// --------------------------------------------------

export const apiService = {

  // --------------------------------------------------
  // PRESUPUESTO
  // --------------------------------------------------

  async getBudget(): Promise<Budget> {
    try {
      const res = await fetch(
        `${API_BASE}/budget`,
        {
          headers: getUserHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Error fetching budget"
        );
      }

      return await res.json();

    } catch (e) {
      console.warn(
        "API fallback for budget:",
        e
      );

      return {
        monto_bs: 0,
        tipo_tasa: "bcv",
        tasa_custom: 742.23,
        spent_bs: 0,
        active_rate: 742.23,
        remaining_bs: 0,
        budget_usd: 0,
        spent_usd: 0,
        remaining_usd: 0,
        percentage_remaining: 0,
      };
    }
  },

  // --------------------------------------------------
  // GUARDAR PRESUPUESTO
  // --------------------------------------------------

  async saveBudget(
    monto_bs: number,
    tipo_tasa: RateType,
    tasa_custom: number
  ): Promise<Budget> {
    const res = await fetch(
      `${API_BASE}/budget`,
      {
        method: "POST",
        headers: getUserHeaders(true),
        body: JSON.stringify({
          monto_bs,
          tipo_tasa,
          tasa_custom,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        "Error saving budget"
      );
    }

    const data = await res.json();

    return data;
  },

  // --------------------------------------------------
  // TASA DE CAMBIO
  // --------------------------------------------------

  async getExchangeRate(
    currency: Currency = "USD"
  ): Promise<ExchangeRateInfo> {
    try {
      const rate =
        await fetchDolarApiRate(
          currency
        );

      console.log(
        `[Rinde+] DolarApi ${currency}:`,
        rate.rate
      );

      return rate;

    } catch (e) {
      console.warn(
        `Error consultando DolarApi para ${currency}:`,
        e
      );

      try {
        const url =
          `${API_BASE}/exchange-rate-public` +
          `?currency=${currency}`;

        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(
            `Backend HTTP ${res.status}`
          );
        }

        const data =
          await res.json();

        const rate =
          Number(data.rate);

        if (
          !Number.isFinite(rate) ||
          rate <= 0
        ) {
          throw new Error(
            `Tasa inválida recibida del backend para ${currency}`
          );
        }

        return {
          rate,

          date:
            data.date ||
            new Date()
              .toISOString()
              .split("T")[0],

          source:
            data.source ||
            `Backend Rinde+ (${currency})`,

          ...(data.last_updated
            ? {
                last_updated:
                  data.last_updated,
              }
            : {}),
        };

      } catch (backendError) {
        console.warn(
          `Backend fallback también falló para ${currency}:`,
          backendError
        );

        return {
          rate:
            currency === "EUR"
              ? 916.00
              : 784.66,

          date:
            new Date()
              .toISOString()
              .split("T")[0],

          source:
            `DolarApi - BCV (respaldo ${currency})`,
        };
      }
    }
  },

  // --------------------------------------------------
  // ACTUALIZAR TASA BCV
  // --------------------------------------------------

  async refreshExchangeRate(): Promise<ExchangeRateInfo> {
    try {
      return await fetchDolarApiRate("USD");

    } catch (e) {
      console.warn(
        "DolarApi refresh failed, using backend:",
        e
      );

      const res = await fetch(
        `${API_BASE}/exchange-rate/fetch`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Error refreshing rate"
        );
      }

      return await res.json();
    }
  },

  // --------------------------------------------------
  // CARRITO
  // --------------------------------------------------

  async getCart(): Promise<CartSummary> {
    try {
      const res = await fetch(
        `${API_BASE}/cart`,
        {
          headers: getUserHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Error fetching cart"
        );
      }

      return await res.json();

    } catch (e) {
      console.warn(
        "API fallback for cart:",
        e
      );

      return {
        items: [],
        total_items: 0,
        total_usd: 0,
        total_bs: 0,
        active_rate: 742.23,
        remaining_bs: 0,
      };
    }
  },

  // --------------------------------------------------
  // AGREGAR PRODUCTO AL CARRITO
  // --------------------------------------------------

  async addToCart(
    name: string,
    price: number,
    quantity: number,
    currency: Currency = "USD",
    rate_used?: number
  ): Promise<void> {
    let finalRate = Number(rate_used);

    if (!Number.isFinite(finalRate) || finalRate <= 0) {
      try {
        const rateInfo = await this.getExchangeRate(currency);
        finalRate = rateInfo.rate;
      } catch {
        finalRate = currency === "EUR" ? 916.00 : 798.33;
      }
    }

    const res = await fetch(
      `${API_BASE}/cart`,
      {
        method: "POST",
        headers: getUserHeaders(true),

        body: JSON.stringify({
          name,
          price_usd: price,
          quantity,
          currency,
          rate_used: finalRate,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        "Error adding item to cart"
      );
    }
  },

  // --------------------------------------------------
  // ACTUALIZAR CANTIDAD
  // --------------------------------------------------

  async updateCartQuantity(
    id: number,
    quantity: number
  ): Promise<void> {
    const res = await fetch(
      `${API_BASE}/cart/${id}`,
      {
        method: "PUT",
        headers: getUserHeaders(true),

        body: JSON.stringify({
          quantity,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(
        "Error updating item quantity"
      );
    }
  },

  // --------------------------------------------------
  // ELIMINAR PRODUCTO
  // --------------------------------------------------

  async deleteCartItem(
    id: number
  ): Promise<void> {
    const res = await fetch(
      `${API_BASE}/cart/${id}`,
      {
        method: "DELETE",
        headers: getUserHeaders(),
      }
    );

    if (!res.ok) {
      throw new Error(
        "Error deleting cart item"
      );
    }
  },

  // --------------------------------------------------
  // CHECKOUT
  // --------------------------------------------------

  async checkout(): Promise<{
    success: boolean;
    record: HistoryRecord;
  }> {
    const res = await fetch(
      `${API_BASE}/cart/checkout`,
      {
        method: "POST",
        headers: getUserHeaders(),
      }
    );

    if (!res.ok) {
      const err =
        await res
          .json()
          .catch(() => ({}));

      throw new Error(
        err.error ||
          "Error al procesar checkout"
      );
    }

    return await res.json();
  },

  // --------------------------------------------------
  // HISTORIAL
  // --------------------------------------------------

  async getHistory(): Promise<
    HistoryRecord[]
  > {
    try {
      const res = await fetch(
        `${API_BASE}/history`,
        {
          headers: getUserHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Error fetching history"
        );
      }

      return await res.json();

    } catch (e) {
      console.warn(
        "API fallback for history:",
        e
      );

      return [];
    }
  },

  async deleteHistoryItem(id: number): Promise<void> {
    const res = await fetch(
      `${API_BASE}/history/${id}`,
      {
        method: "DELETE",
        headers: getUserHeaders(),
      }
    );

    if (!res.ok) {
      throw new Error(
        "Error al eliminar el registro del historial"
      );
    }
  },

  async clearHistory(): Promise<void> {
    const res = await fetch(
      `${API_BASE}/history`,
      {
        method: "DELETE",
        headers: getUserHeaders(),
      }
    );

    if (!res.ok) {
      throw new Error(
        "Error al vaciar el historial"
      );
    }
  },

  // --------------------------------------------------
  // PRECIOS DE LA COMUNIDAD
  // --------------------------------------------------

  async getCommunityPrices(
    filters?: CommunityPriceFilters
  ): Promise<CommunityPrice[]> {
    try {
      const query =
        buildCommunityQuery(filters);

      const res = await fetch(
        `${API_BASE}/community-prices${query}`,
        {
          headers: getUserHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Error fetching community prices"
        );
      }

      return await res.json();

    } catch (e) {
      console.warn(
        "API fallback for community prices:",
        e
      );

      return [];
    }
  },

  // --------------------------------------------------
  // PRECIOS AGRUPADOS
  // --------------------------------------------------

  async getCommunityPriceGroups(
    filters?: CommunityPriceFilters
  ): Promise<CommunityPriceGroup[]> {
    try {
      const query =
        buildCommunityQuery(filters);

      const res = await fetch(
        `${API_BASE}/community-prices/grouped${query}`,
        {
          headers: getUserHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Error fetching grouped community prices"
        );
      }

      const data =
        await res.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid grouped community price response"
        );
      }

      return data as CommunityPriceGroup[];

    } catch (e) {
      console.warn(
        "API fallback for grouped community prices:",
        e
      );

      return [];
    }
  },

  // --------------------------------------------------
  // COMPARTIR PRECIO
  // --------------------------------------------------

  async sharePrice(payload: {
    product: string;
    price_usd: number;
    supermarket: string;
    city: string;
    state: string;
    user_name?: string;
  }): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers = getUserHeaders(true);

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const res = await fetch(
      `${API_BASE}/community-prices`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(
          payload
        ),
      }
    );

    if (!res.ok) {
      const errorData =
        await res
          .json()
          .catch(() => ({}));

      throw new Error(
        errorData.error ||
          "Error publicando precio"
      );
    }
  },

  // --------------------------------------------------
  // ELIMINAR PRECIO DE LA COMUNIDAD
  // --------------------------------------------------

  async deleteCommunityPrice(id: number): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers = getUserHeaders();

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const res = await fetch(
      `${API_BASE}/community-prices/${id}`,
      {
        method: "DELETE",
        headers,
      }
    );

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({}));

      throw new Error(
        errorData.error ||
          "Error al eliminar el precio de la comunidad."
      );
    }
  },
};