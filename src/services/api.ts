import {
  Budget,
  CartSummary,
  HistoryRecord,
  CommunityPrice,
  ExchangeRateInfo,
  RateType,
} from "../types";

const BASE_URL =
  import.meta.env.VITE_API_URL || "https://rinde-plus.onrender.com";

const API_BASE = `${BASE_URL.replace(/\/$/, "")}/app-api`;

const USER_ID_STORAGE_KEY = "rinde_plus_user_id";

export interface CommunityPriceOffer extends CommunityPrice {
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
  const existingUserId = localStorage.getItem(USER_ID_STORAGE_KEY);

  if (existingUserId) {
    return existingUserId;
  }

  const newUserId = createUserId();
  localStorage.setItem(USER_ID_STORAGE_KEY, newUserId);

  return newUserId;
}

function getUserHeaders(
  includeJsonContentType = false
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-User-ID": getUserId(),
  };

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function buildCommunityQuery(filters?: CommunityPriceFilters): string {
  const params = new URLSearchParams();

  if (filters?.product?.trim()) {
    params.set("product", filters.product.trim());
  }

  if (filters?.city?.trim()) {
    params.set("city", filters.city.trim());
  }

  if (filters?.state?.trim()) {
    params.set("state", filters.state.trim());
  }

  if (filters?.sort) {
    params.set("sort", filters.sort);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

export const apiService = {
  // Fetch budget
  async getBudget(): Promise<Budget> {
    try {
      const res = await fetch(`${API_BASE}/budget`, {
        headers: getUserHeaders(),
      });

      if (!res.ok) {
        throw new Error("Error fetching budget");
      }

      return await res.json();
    } catch (e) {
      console.warn("API fallback for budget:", e);

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

  // Save/update budget
  async saveBudget(
    monto_bs: number,
    tipo_tasa: RateType,
    tasa_custom: number
  ): Promise<Budget> {
    const res = await fetch(`${API_BASE}/budget`, {
      method: "POST",
      headers: getUserHeaders(true),
      body: JSON.stringify({
        monto_bs,
        tipo_tasa,
        tasa_custom,
      }),
    });

    if (!res.ok) {
      throw new Error("Error saving budget");
    }

    const data = await res.json();
    return data.budget;
  },

  // Fetch exchange rate info
  async getExchangeRate(): Promise<ExchangeRateInfo> {
    try {
      const res = await fetch(`${API_BASE}/exchange-rate-public`);

      if (!res.ok) {
        throw new Error("Error fetching exchange rate");
      }

      return await res.json();
    } catch (e) {
      console.warn("API fallback for exchange rate:", e);

      return {
        rate: 742.23,
        date: new Date().toISOString().split("T")[0],
        source: "Banco Central de Venezuela (BCV)",
      };
    }
  },

  // Force BCV refresh
  async refreshExchangeRate(): Promise<ExchangeRateInfo> {
    const res = await fetch(`${API_BASE}/exchange-rate/fetch`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error("Error refreshing rate");
    }

    return await res.json();
  },

  // Fetch cart
  async getCart(): Promise<CartSummary> {
    try {
      const res = await fetch(`${API_BASE}/cart`, {
        headers: getUserHeaders(),
      });

      if (!res.ok) {
        throw new Error("Error fetching cart");
      }

      return await res.json();
    } catch (e) {
      console.warn("API fallback for cart:", e);

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

  // Add item to cart
  async addToCart(
    name: string,
    price_usd: number,
    quantity: number
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/cart`, {
      method: "POST",
      headers: getUserHeaders(true),
      body: JSON.stringify({
        name,
        price_usd,
        quantity,
      }),
    });

    if (!res.ok) {
      throw new Error("Error adding item to cart");
    }
  },

  // Update item quantity
  async updateCartQuantity(
    id: number,
    quantity: number
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/cart/${id}`, {
      method: "PUT",
      headers: getUserHeaders(true),
      body: JSON.stringify({ quantity }),
    });

    if (!res.ok) {
      throw new Error("Error updating item quantity");
    }
  },

  // Delete item from cart
  async deleteCartItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/cart/${id}`, {
      method: "DELETE",
      headers: getUserHeaders(),
    });

    if (!res.ok) {
      throw new Error("Error deleting cart item");
    }
  },

  // Checkout
  async checkout(): Promise<{
    success: boolean;
    record: HistoryRecord;
  }> {
    const res = await fetch(`${API_BASE}/cart/checkout`, {
      method: "POST",
      headers: getUserHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al procesar checkout");
    }

    return await res.json();
  },

  // Get shopping history
  async getHistory(): Promise<HistoryRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: getUserHeaders(),
      });

      if (!res.ok) {
        throw new Error("Error fetching history");
      }

      return await res.json();
    } catch (e) {
      console.warn("API fallback for history:", e);
      return [];
    }
  },

  // Get the original flat community price list
  async getCommunityPrices(
    filters?: CommunityPriceFilters
  ): Promise<CommunityPrice[]> {
    try {
      const query = buildCommunityQuery(filters);

      const res = await fetch(`${API_BASE}/community-prices${query}`, {
        headers: getUserHeaders(),
      });

      if (!res.ok) {
        throw new Error("Error fetching community prices");
      }

      return await res.json();
    } catch (e) {
      console.warn("API fallback for community prices:", e);
      return [];
    }
  },

  // Get community prices grouped by product
  async getCommunityPriceGroups(
    filters?: CommunityPriceFilters
  ): Promise<CommunityPriceGroup[]> {
    try {
      const query = buildCommunityQuery(filters);

      const res = await fetch(
        `${API_BASE}/community-prices/grouped${query}`,
        {
          headers: getUserHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error("Error fetching grouped community prices");
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid grouped community price response");
      }

      return data as CommunityPriceGroup[];
    } catch (e) {
      console.warn("API fallback for grouped community prices:", e);
      return [];
    }
  },

  // Share a price to community
  async sharePrice(payload: {
    product: string;
    price_usd: number;
    supermarket: string;
    city: string;
    state: string;
    user_name?: string;
  }): Promise<void> {
    const res = await fetch(`${API_BASE}/community-prices`, {
      method: "POST",
      headers: getUserHeaders(true),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      throw new Error(
        errorData.error || "Error publicando precio"
      );
    }
  },
};