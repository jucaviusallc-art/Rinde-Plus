export type ScreenName =
  | "inicio"
  | "dashboard"
  | "agregar"
  | "carrito"
  | "historial"
  | "comunidad"
  | "perfil";

export type RateType = "bcv" | "custom";

export interface Budget {
  id?: number;
  monto_bs: number;
  tipo_tasa: RateType;
  tasa_custom: number;
  spent_bs: number;
  active_rate: number;
  remaining_bs: number;
  budget_usd: number;
  spent_usd: number;
  remaining_usd: number;
  percentage_remaining: number;
  updated_at?: string;
}

export interface CartItem {
  id: number;
  name: string;
  price_usd: number;
  price_bs: number;
  quantity: number;
  rate_used: number;
  subtotal_usd: number;
  subtotal_bs: number;
  created_at?: string;
}

export interface CartSummary {
  items: CartItem[];
  total_items: number;
  total_usd: number;
  total_bs: number;
  active_rate: number;
  remaining_bs: number;
}

export interface SnapshotItem {
  name: string;
  price_usd: number;
  price_bs: number;
  quantity: number;
  subtotal_usd: number;
  subtotal_bs: number;
}

export interface HistoryRecord {
  id: number;
  date: string;
  total_bs: number;
  total_usd: number;
  rate_used: number;
  budget_bs: number;
  remaining_bs: number;
  items: SnapshotItem[];
  created_at: string;
}

export interface CommunityPrice {
  id: number;
  product: string;
  price_usd: number;
  price_bs: number;
  supermarket: string;
  city: string;
  state: string;
  user_name: string;
  is_lowest?: boolean;
  created_at: string;
}

export interface ExchangeRateInfo {
  rate: number;
  date: string;
  source: string;
  last_updated?: string;
}
