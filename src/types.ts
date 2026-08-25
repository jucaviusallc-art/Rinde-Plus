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

/**
 * Información de una tasa de cambio.
 *
 * USD:
 *   Bs por 1 USD
 *
 * EUR:
 *   Bs por 1 EUR
 */
export interface ExchangeRateInfo {
  rate: number;
  date: string;
  source: string;
  last_updated?: string;
}

/**
 * Presupuesto activo.
 */
export interface Budget {
  id?: number;

  /**
   * Presupuesto inicial en bolívares.
   */
  monto_bs: number;

  /**
   * Tipo de tasa seleccionada por el usuario.
   */
  tipo_tasa: RateType;

  /**
   * Tasa personalizada, si corresponde.
   */
  tasa_custom: number;

  /**
   * Total gastado en bolívares.
   */
  spent_bs: number;

  /**
   * Tasa actualmente seleccionada.
   *
   * Se mantiene por compatibilidad con el backend
   * y componentes existentes.
   */
  active_rate: number;

  /**
   * Saldo restante en bolívares.
   */
  remaining_bs: number;

  /**
   * Equivalente del presupuesto en USD.
   */
  budget_usd: number;

  /**
   * Equivalente gastado en USD.
   */
  spent_usd: number;

  /**
   * Equivalente restante en USD.
   */
  remaining_usd: number;

  /**
   * Porcentaje restante del presupuesto.
   */
  percentage_remaining: number;

  updated_at?: string;
}

/**
 * Producto agregado al carrito.
 */
export interface CartItem {
  id: number;

  name: string;

  /**
   * Moneda original introducida por el usuario.
   *
   * USD = dólar
   * EUR = euro
   */
  currency: Currency;

  /**
   * Precio original del producto.
   *
   * El nombre price_usd se conserva por compatibilidad
   * con la estructura existente del proyecto.
   *
   * Cuando currency === "USD":
   *   representa USD.
   *
   * Cuando currency === "EUR":
   *   representa EUR.
   */
  price_usd: number;

  /**
   * Precio unitario convertido a bolívares.
   */
  price_bs: number;

  /**
   * Tasa EXACTA utilizada para convertir este producto.
   *
   * USD -> Bs/USD
   * EUR -> Bs/EUR
   *
   * IMPORTANTE:
   * Este valor pertenece al producto y no debe sustituirse
   * posteriormente por la tasa actualmente seleccionada.
   */
  rate_used: number;

  /**
   * Cantidad comprada.
   */
  quantity: number;

  /**
   * Subtotal en la moneda original.
   *
   * USD si currency === "USD"
   * EUR si currency === "EUR"
   */
  subtotal_usd: number;

  /**
   * Subtotal convertido a bolívares.
   */
  subtotal_bs: number;

  created_at?: string;
}

/**
 * Resumen actual del carrito.
 */
export interface CartSummary {
  items: CartItem[];

  total_items: number;

  /**
   * Total en moneda de compatibilidad.
   *
   * No debe utilizarse para determinar la tasa individual
   * de un producto.
   */
  total_usd: number;

  /**
   * Total real de todos los productos en bolívares.
   */
  total_bs: number;

  /**
   * Tasa actualmente seleccionada en la aplicación.
   */
  active_rate: number;

  /**
   * Saldo restante del presupuesto.
   */
  remaining_bs: number;
}

/**
 * Producto guardado dentro de una compra finalizada.
 *
 * Es un SNAPSHOT de los datos en el momento de la compra.
 * Por esta razón, rate_used nunca debe recalcularse con
 * la tasa actual.
 */
export interface SnapshotItem {
  name: string;

  /**
   * Moneda original del producto.
   */
  currency: Currency;

  /**
   * Precio original del producto.
   *
   * Se mantiene price_usd por compatibilidad.
   */
  price_usd: number;

  /**
   * Precio unitario en bolívares en el momento
   * de finalizar la compra.
   */
  price_bs: number;

  /**
   * Cantidad comprada.
   */
  quantity: number;

  /**
   * Tasa EXACTA aplicada al producto en el momento
   * de realizar la compra.
   *
   * USD -> tasa USD
   * EUR -> tasa EUR
   */
  rate_used: number;

  /**
   * Subtotal en moneda original.
   */
  subtotal_usd: number;

  /**
   * Subtotal en bolívares.
   */
  subtotal_bs: number;
}

/**
 * Registro de una compra finalizada.
 */
export interface HistoryRecord {
  id: number;

  /**
   * Fecha legible del registro.
   */
  date: string;

  /**
   * Total de la compra en bolívares.
   */
  total_bs: number;

  /**
   * Equivalente total almacenado en moneda de compatibilidad.
   *
   * HistoryScreen NO debe utilizar este campo para decidir
   * qué tasa mostrar cuando existen productos USD y EUR.
   *
   * Para mostrar la tasa correcta debe utilizar:
   * items[].rate_used
   * junto con
   * items[].currency
   */
  total_usd: number;

  /**
   * Tasa general del registro por compatibilidad.
   *
   * Cuando existen diferentes monedas, este campo NO representa
   * necesariamente la tasa de todos los productos.
   *
   * Para cada producto debe utilizarse SnapshotItem.rate_used.
   */
  rate_used: number;

  /**
   * Presupuesto inicial en bolívares.
   */
  budget_bs: number;

  /**
   * Saldo restante en bolívares después de la compra.
   */
  remaining_bs: number;

  /**
   * Productos comprados.
   *
   * Cada producto conserva su moneda y su tasa histórica.
   */
  items: SnapshotItem[];

  created_at: string;
}

/**
 * Precio publicado por un usuario en la comunidad.
 */
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