export type ScreenName =
  | "inicio"
  | "dashboard"
  | "agregar"
  | "carrito"
  | "historial"
  | "comunidad"
  | "perfil";

export type RateType = "bcv" | "custom";

export type Currency = "USD" | "EUR";

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

  /**
   * Moneda original en la que el usuario
   * introdujo el precio del producto.
   */
  currency: Currency;

  /**
   * Precio original del producto.
   * Se mantiene como price_usd por compatibilidad
   * con la estructura existente de la aplicación,
   * aunque puede representar EUR cuando currency === "EUR".
   */
  price_usd: number;

  /**
   * Precio unitario convertido a bolívares
   * usando la tasa correspondiente al producto.
   */
  price_bs: number;

  quantity: number;

  /**
   * Tasa Bs aplicada específicamente a este producto.
   *
   * USD -> tasa USD/Bs
   * EUR -> tasa EUR/Bs
   */
  rate_used: number;

  /**
   * Subtotal expresado en la moneda original.
   */
  subtotal_usd: number;

  /**
   * Subtotal convertido a bolívares.
   */
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

  /**
   * Moneda original del producto al momento
   * de realizar la compra.
   */
  currency: Currency;

  /**
   * Precio original del producto.
   * Se conserva el nombre price_usd por compatibilidad
   * con la estructura existente.
   */
  price_usd: number;

  /**
   * Precio unitario en bolívares al momento
   * de realizar la compra.
   */
  price_bs: number;

  quantity: number;

  /**
   * Tasa exacta utilizada para este producto
   * al momento de la compra.
   */
  rate_used: number;

  /**
   * Subtotal en la moneda original.
   */
  subtotal_usd: number;

  /**
   * Subtotal en bolívares.
   */
  subtotal_bs: number;
}

export interface HistoryRecord {
  id: number;
  date: string;

  /**
   * Total de la compra en bolívares.
   */
  total_bs: number;

  /**
   * Total equivalente en la moneda correspondiente
   * según los datos almacenados por el backend.
   */
  total_usd: number;

  /**
   * Tasa general/compatibilidad del registro.
   *
   * Para mostrar correctamente las tasas cuando existen
   * varias monedas, HistoryScreen utiliza preferentemente
   * SnapshotItem.rate_used.
   */
  rate_used: number;

  budget_bs: number;
  remaining_bs: number;

  /**
   * Cada producto conserva su moneda y su tasa.
   */
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