import {
  Budget,
  CartSummary,
  HistoryRecord,
  CommunityPrice,
  ExchangeRateInfo,
  RateType,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || 'https://rinde-plus.onrender.com';
const API_BASE = `${BASE_URL.replace(/\/$/, '')}/app-api`;

export const apiService = {
  // Fetch budget
  async getBudget(): Promise<Budget> {
    try {
      const res = await fetch(`${API_BASE}/budget`);
      if (!res.ok) throw new Error("Error fetching budget");
      return await res.json();
    } catch (e) {
      console.warn("API fallback for budget:", e);
      return {
        monto_bs: 3500,
        tipo_tasa: "bcv",
        tasa_custom: 72.5,
        spent_bs: 0,
        active_rate: 72.5,
        remaining_bs: 3500,
        budget_usd: 48.28,
        spent_usd: 0,
        remaining_usd: 48.28,
        percentage_remaining: 100,
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto_bs, tipo_tasa, tasa_custom }),
    });
    if (!res.ok) throw new Error("Error saving budget");
    const data = await res.json();
    return data.budget;
  },

  // Fetch exchange rate info
  async getExchangeRate(): Promise<ExchangeRateInfo> {
    try {
      const res = await fetch(`${API_BASE}/exchange-rate-public`);
      if (!res.ok) throw new Error("Error fetching exchange rate");
      return await res.json();
    } catch (e) {
      return {
        rate: 72.5,
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
    if (!res.ok) throw new Error("Error refreshing rate");
    return await res.json();
  },

  // Fetch cart
  async getCart(): Promise<CartSummary> {
    try {
      const res = await fetch(`${API_BASE}/cart`);
      if (!res.ok) throw new Error("Error fetching cart");
      return await res.json();
    } catch (e) {
      return {
        items: [],
        total_items: 0,
        total_usd: 0,
        total_bs: 0,
        active_rate: 72.5,
        remaining_bs: 3500,
      };
    }
  },

  // Add item to cart
  async addToCart(name: string, price_usd: number, quantity: number): Promise<void> {
    const res = await fetch(`${API_BASE}/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price_usd, quantity }),
    });
    if (!res.ok) throw new Error("Error adding item to cart");
  },

  // Update item quantity
  async updateCartQuantity(id: number, quantity: number): Promise<void> {
    const res = await fetch(`${API_BASE}/cart/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) throw new Error("Error updating item quantity");
  },

  // Delete item from cart
  async deleteCartItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/cart/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Error deleting cart item");
  },

  // Checkout
  async checkout(): Promise<{ success: boolean; record: HistoryRecord }> {
    const res = await fetch(`${API_BASE}/cart/checkout`, {
      method: "POST",
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
      const res = await fetch(`${API_BASE}/history`);
      if (!res.ok) throw new Error("Error fetching history");
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
      if (filters?.product) params.set("product", filters.product);
      if (filters?.city) params.set("city", filters.city);
      if (filters?.state) params.set("state", filters.state);
      if (filters?.sort) params.set("sort", filters.sort);

      const res = await fetch(`${API_BASE}/community-prices?${params.toString()}`);
      if (!res.ok) throw new Error("Error fetching community prices");
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error publicando precio");
  },
};
