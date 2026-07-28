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
      return [];
    }
  },

  // Get community prices with filters
  async getCommunityPrices(filters?: {
    product?: string;
    city?: string;
    state?: string;
    sort?: string;
  }): Promise<CommunityPrice[]> {
    try {
      const params = new URLSearchParams();

      if (filters?.product) {
        params.set("product", filters.product);
      }

      if (filters?.city) {
        params.set("city", filters.city);
      }

      if (filters?.state) {
        params.set("state", filters.state);
      }

      if (filters?.sort) {
        params.set("sort", filters.sort);
      }

      const res = await fetch(
        `${API_BASE}/community-prices?${params.toString()}`,
        {
          headers: getUserHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error("Error fetching community prices");
      }

      return await res.json();
    } catch (e) {
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
      throw new Error("Error publicando precio");
    }
  },
};