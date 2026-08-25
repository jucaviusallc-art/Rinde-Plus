import cors from "cors";
import express, { Request } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(process.cwd(), "db_rinde.json");

/*
 * TASAS DE RESPALDO
 *
 * Estas tasas solamente se utilizan si no existe información
 * válida en la base de datos y la consulta externa no está disponible.
 *
 * NO se utiliza ninguna fórmula EUR = USD * factor.
 */
const DEFAULT_USD_RATE = 784.66;
const DEFAULT_EUR_RATE = 916.00;

interface Budget {
  id: number;
  user_id: string;
  monto_bs: number;
  tipo_tasa: "bcv" | "custom";
  tasa_custom: number;
  spent_bs: number;
  updated_at: string;
}

type Currency = "USD" | "EUR";

interface CartItem {
  id: number;
  user_id: string;
  name: string;

  /*
   * Se conserva el nombre price_usd por compatibilidad
   * con la aplicación existente.
   *
   * El valor representa realmente el precio ingresado
   * en la moneda indicada por "currency".
   */
  price_usd: number;

  currency: Currency;
  quantity: number;

  /*
   * Tasa BCV utilizada exactamente al agregar el producto.
   */
  rate_used: number;

  created_at: string;
}

interface HistoryRecord {
  id: number;
  user_id: string;
  date: string;
  total_bs: number;
  total_usd: number;

  /*
   * Para compras de una sola moneda representa la tasa
   * aplicada a esa compra.
   *
   * Se mantiene por compatibilidad con HistoryScreen.
   */
  rate_used: number;

  budget_bs: number;
  remaining_bs: number;

  items: Array<{
    name: string;
    price_usd: number;
    currency: Currency;
    price_bs: number;
    quantity: number;
    subtotal_usd: number;
    subtotal_bs: number;

    /*
     * Nueva información: tasa exacta utilizada
     * por este producto.
     */
    rate_used?: number;
  }>;

  created_at: string;
}

interface CommunityPrice {
  id: number;
  product: string;
  price_usd: number;
  price_bs: number;
  supermarket: string;
  city: string;
  state: string;
  user_name: string;
  created_at: string;
}

interface CommunityPriceGroup {
  product: string;
  city: string;
  state: string;
  lowest_price_usd: number;
  highest_price_usd: number;
  average_price_usd: number;
  lowest_price_bs: number;
  highest_price_bs: number;
  average_price_bs: number;
  reports: number;
  supermarkets: number;
  latest_report_at: string;
  offers: Array<CommunityPrice & {
    is_lowest: boolean;
  }>;
}

/*
 * ============================================================
 * TASAS DE CAMBIO
 * ============================================================
 *
 * Antes:
 *
 *   rate_usd
 *
 * y EUR se calculaba:
 *
 *   USD * 1.065
 *
 * Eso era incorrecto.
 *
 * Ahora:
 *
 *   rate_usd = tasa oficial USD/Bs
 *   rate_eur = tasa oficial EUR/Bs
 *
 * Ambas se obtienen independientemente.
 */
interface ExchangeRate {
  id: number;

  rate_usd: number;
  rate_eur: number;

  rate_date: string;
  source: string;
  created_at: string;
}

interface DatabaseSchema {
  budgets: Budget[];
  cart_items: CartItem[];
  shopping_history: HistoryRecord[];
  community_prices: CommunityPrice[];
  exchange_rates: ExchangeRate[];

  next_budget_id: number;
  next_cart_id: number;
  next_history_id: number;
  next_community_id: number;
}

interface LegacyExchangeRate {
  id?: number;

  /*
   * Formato antiguo.
   */
  rate_usd?: number;

  /*
   * Formato nuevo.
   */
  rate_eur?: number;

  rate_date?: string;
  source?: string;
  created_at?: string;
}

interface LegacyDatabaseSchema {
  budget?: Budget;
  budgets?: Budget[];

  cart_items?: CartItem[];
  shopping_history?: HistoryRecord[];
  community_prices?: CommunityPrice[];

  exchange_rates?: LegacyExchangeRate[];

  next_budget_id?: number;
  next_cart_id?: number;
  next_history_id?: number;
  next_community_id?: number;
}

/*
 * ============================================================
 * BASE DE DATOS
 * ============================================================
 */

function createEmptyDatabase(): DatabaseSchema {
  const now = new Date().toISOString();

  return {
    budgets: [],
    cart_items: [],
    shopping_history: [],
    community_prices: [],

    exchange_rates: [
      {
        id: 1,
        rate_usd: DEFAULT_USD_RATE,
        rate_eur: DEFAULT_EUR_RATE,
        rate_date: now.split("T")[0],
        source: "DolarApi - Oficial",
        created_at: now,
      },
    ],

    next_budget_id: 1,
    next_cart_id: 1,
    next_history_id: 1,
    next_community_id: 1,
  };
}

function normalizeDatabase(
  raw: LegacyDatabaseSchema
): DatabaseSchema {
  const budgets = Array.isArray(raw.budgets)
    ? raw.budgets
    : raw.budget
      ? [raw.budget]
      : [];

  const cartItems: CartItem[] = Array.isArray(
    raw.cart_items
  )
    ? raw.cart_items.map(
        (item): CartItem => ({
          ...item,
          currency:
            item.currency === "EUR"
              ? "EUR"
              : "USD",
        })
      )
    : [];

  const history = Array.isArray(
    raw.shopping_history
  )
    ? raw.shopping_history
    : [];

  const communityPrices =
    Array.isArray(raw.community_prices)
      ? raw.community_prices
      : [];

  const rawRates = Array.isArray(
    raw.exchange_rates
  )
    ? raw.exchange_rates
    : [];

  /*
   * Compatibilidad con bases anteriores.
   *
   * IMPORTANTE:
   * No calculamos EUR a partir de USD.
   *
   * Si un registro antiguo no tiene rate_eur,
   * utilizamos el valor de respaldo hasta que
   * refreshExchangeRates() actualice ambas tasas.
   */
  const exchangeRates: ExchangeRate[] =
    rawRates.length > 0
      ? rawRates.map((record, index) => ({
          id:
            record.id ??
            index + 1,

          rate_usd:
            Number.isFinite(
              Number(record.rate_usd)
            ) &&
            Number(record.rate_usd) > 0
              ? Number(record.rate_usd)
              : DEFAULT_USD_RATE,

          rate_eur:
            Number.isFinite(
              Number(record.rate_eur)
            ) &&
            Number(record.rate_eur) > 0
              ? Number(record.rate_eur)
              : DEFAULT_EUR_RATE,

          rate_date:
            record.rate_date ||
            new Date()
              .toISOString()
              .split("T")[0],

          source:
            record.source ||
            "DolarApi - Oficial",

          created_at:
            record.created_at ||
            new Date().toISOString(),
        }))
      : createEmptyDatabase().exchange_rates;

  return {
    budgets,

    cart_items: cartItems,

    shopping_history: history,

    community_prices: communityPrices,

    exchange_rates: exchangeRates,

    next_budget_id:
      raw.next_budget_id ??
      Math.max(
        0,
        ...budgets.map(
          (budget) => budget.id || 0
        )
      ) + 1,

    next_cart_id:
      raw.next_cart_id ??
      Math.max(
        0,
        ...cartItems.map(
          (item) => item.id || 0
        )
      ) + 1,

    next_history_id:
      raw.next_history_id ??
      Math.max(
        0,
        ...history.map(
          (record) => record.id || 0
        )
      ) + 1,

    next_community_id:
      raw.next_community_id ??
      Math.max(
        0,
        ...communityPrices.map(
          (price) => price.id || 0
        )
      ) + 1,
  };
}

function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(
        DB_FILE,
        "utf-8"
      );

      return normalizeDatabase(
        JSON.parse(data)
      );
    }
  } catch (err) {
    console.error(
      "Error reading database file, using fallback:",
      err
    );
  }

  return createEmptyDatabase();
}

function writeDb(
  db: DatabaseSchema
): void {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(db, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error(
      "Error writing database file:",
      err
    );
  }
}

/*
 * ============================================================
 * USUARIO
 * ============================================================
 */

function getUserId(
  req: Request
): string {
  const header = req
    .header("X-User-ID")
    ?.trim();

  if (!header) {
    return "user_default";
  }

  return header.slice(0, 200);
}

/*
 * ============================================================
 * TASAS
 * ============================================================
 */

function getLatestExchangeRate(
  db: DatabaseSchema
): ExchangeRate {
  const rates = db.exchange_rates;

  if (
    rates.length === 0
  ) {
    return createEmptyDatabase()
      .exchange_rates[0];
  }

  return rates[rates.length - 1];
}

function getLatestUsdRate(
  db: DatabaseSchema
): number {
  return (
    getLatestExchangeRate(db)
      .rate_usd ||
    DEFAULT_USD_RATE
  );
}

function getLatestEurRate(
  db: DatabaseSchema
): number {
  return (
    getLatestExchangeRate(db)
      .rate_eur ||
    DEFAULT_EUR_RATE
  );
}

/*
 * Tasa activa del presupuesto.
 *
 * El presupuesto mantiene su comportamiento original:
 * "bcv" utiliza la tasa USD como referencia interna.
 *
 * La moneda concreta de cada producto se determina
 * mediante getCurrencyRate().
 */
function getActiveRate(
  db: DatabaseSchema,
  budget: Budget
): number {
  return budget.tipo_tasa === "custom"
    ? budget.tasa_custom
    : getLatestUsdRate(db);
}

/*
 * Obtiene la tasa correcta para la moneda del producto.
 *
 * ESTA ES LA CORRECCIÓN PRINCIPAL.
 *
 * USD -> rate_usd
 * EUR -> rate_eur
 *
 * Nunca:
 *
 * EUR = USD * 1.065
 */
function getCurrencyRate(
  db: DatabaseSchema,
  budget: Budget,
  currency: Currency
): number {
  /*
   * Para una tasa personalizada se conserva
   * el comportamiento anterior.
   */
  if (
    budget.tipo_tasa === "custom"
  ) {
    return budget.tasa_custom;
  }

  if (currency === "EUR") {
    return getLatestEurRate(db);
  }

  return getLatestUsdRate(db);
}

/*
 * ============================================================
 * PRESUPUESTO
 * ============================================================
 */

function createBudget(
  db: DatabaseSchema,
  userId: string
): Budget {
  const budget: Budget = {
    id: db.next_budget_id++,
    user_id: userId,

    monto_bs: 0,

    tipo_tasa: "bcv",

    tasa_custom: DEFAULT_USD_RATE,

    spent_bs: 0,

    updated_at:
      new Date().toISOString(),
  };

  db.budgets.push(budget);

  return budget;
}

function getOrCreateBudget(
  db: DatabaseSchema,
  userId: string
): Budget {
  return (
    db.budgets.find(
      (budget) =>
        budget.user_id === userId
    ) ||
    createBudget(db, userId)
  );
}

/*
 * ============================================================
 * CARRITO
 * ============================================================
 */

function getUserCart(
  db: DatabaseSchema,
  userId: string
): CartItem[] {
  return db.cart_items.filter(
    (item) =>
      item.user_id === userId
  );
}

function recalculateSpentBs(
  db: DatabaseSchema,
  userId: string,
  budget: Budget
): number {
  const totalBs =
    getUserCart(db, userId).reduce(
      (acc, item) => {
        const rate =
          item.rate_used ||
          getCurrencyRate(
            db,
            budget,
            item.currency
          );

        return (
          acc +
          item.price_usd *
            item.quantity *
            rate
        );
      },
      0
    );

  const roundedSpent =
    Math.round(
      totalBs * 100
    ) / 100;

  budget.spent_bs =
    roundedSpent;

  return roundedSpent;
}

function buildBudgetResponse(
  db: DatabaseSchema,
  budget: Budget
) {
  const activeRate =
    getActiveRate(
      db,
      budget
    );

  const remainingBs =
    Math.max(
      0,
      Math.round(
        (
          budget.monto_bs -
          budget.spent_bs
        ) * 100
      ) / 100
    );

  const safeRate =
    activeRate > 0
      ? activeRate
      : DEFAULT_USD_RATE;

  return {
    ...budget,

    active_rate:
      safeRate,

    remaining_bs:
      remainingBs,

    budget_usd:
      Math.round(
        (
          budget.monto_bs /
          safeRate
        ) * 100
      ) / 100,

    spent_usd:
      Math.round(
        (
          budget.spent_bs /
          safeRate
        ) * 100
      ) / 100,

    remaining_usd:
      Math.round(
        (
          remainingBs /
          safeRate
        ) * 100
      ) / 100,

    percentage_remaining:
      budget.monto_bs > 0
        ? Math.max(
            0,
            Math.round(
              (
                (
                  budget.monto_bs -
                  budget.spent_bs
                ) /
                budget.monto_bs
              ) * 100
            )
          )
        : 0,
  };
}

/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function roundMoney(
  value: number
): number {
  return (
    Math.round(
      value * 100
    ) / 100
  );
}

function normalizeProductKey(
  product: string
): string {
  return product
    .trim()
    .toLocaleLowerCase("es-VE")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/*
 * ============================================================
 * PRECIOS COMUNITARIOS
 * ============================================================
 */

function groupCommunityPrices(
  prices: CommunityPrice[]
): CommunityPriceGroup[] {
  const grouped =
    new Map<
      string,
      CommunityPrice[]
    >();

  for (const price of prices) {
    const productKey =
      normalizeProductKey(
        price.product
      ) ||
      `product-${price.id}`;

    const cityKey =
      normalizeProductKey(
        price.city
      ) ||
      "city-unknown";

    const stateKey =
      normalizeProductKey(
        price.state
      ) ||
      "state-unknown";

    const key =
      `${productKey}|${cityKey}|${stateKey}`;

    const current =
      grouped.get(key) ||
      [];

    current.push(price);

    grouped.set(
      key,
      current
    );
  }

  return Array.from(
    grouped.values()
  ).map((group) => {
    const offersByPrice =
      [...group].sort(
        (a, b) => {
          if (
            a.price_usd !==
            b.price_usd
          ) {
            return (
              a.price_usd -
              b.price_usd
            );
          }

          return (
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
          );
        }
      );

    const lowestPriceUsd =
      offersByPrice[0]
        ?.price_usd || 0;

    const usdTotal =
      group.reduce(
        (sum, price) =>
          sum +
          price.price_usd,
        0
      );

    const bsTotal =
      group.reduce(
        (sum, price) =>
          sum +
          price.price_bs,
        0
      );

    const latestReportAt =
      group.reduce(
        (
          latest,
          price
        ) =>
          new Date(
            price.created_at
          ).getTime() >
          new Date(
            latest
          ).getTime()
            ? price.created_at
            : latest,
        group[0].created_at
      );

    return {
      product:
        group[0].product,

      city:
        group[0].city,

      state:
        group[0].state,

      lowest_price_usd:
        roundMoney(
          Math.min(
            ...group.map(
              (price) =>
                price.price_usd
            )
          )
        ),

      highest_price_usd:
        roundMoney(
          Math.max(
            ...group.map(
              (price) =>
                price.price_usd
            )
          )
        ),

      average_price_usd:
        roundMoney(
          usdTotal /
            group.length
        ),

      lowest_price_bs:
        roundMoney(
          Math.min(
            ...group.map(
              (price) =>
                price.price_bs
            )
          )
        ),

      highest_price_bs:
        roundMoney(
          Math.max(
            ...group.map(
              (price) =>
                price.price_bs
            )
          )
        ),

      average_price_bs:
        roundMoney(
          bsTotal /
            group.length
        ),

      reports:
        group.length,

      supermarkets:
        new Set(
          group.map(
            (price) =>
              price.supermarket
                .trim()
                .toLocaleLowerCase(
                  "es-VE"
                )
          )
        ).size,

      latest_report_at:
        latestReportAt,

      offers:
        offersByPrice.map(
          (offer) => ({
            ...offer,

            is_lowest:
              offer.price_usd ===
              lowestPriceUsd,
          })
        ),
    };
  });
}

/*
 * ============================================================
 * CONSULTA AL BCV
 * ============================================================
 *
 * DolarApi dispone de endpoints independientes:
 *
 * USD:
 * /v1/dolares/oficial
 *
 * EUR:
 * /v1/euros/oficial
 *
 * Por lo tanto ya NO hacemos:
 *
 * EUR = USD * 1.065
 *
 * Las dos tasas se consultan independientemente.
 */

interface DolarApiResponse {
  promedio?: number;
  compra?: number;
  venta?: number;
  fechaActualizacion?: string;
  moneda?: string;
  fuente?: string;
  nombre?: string;
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 10000
): Promise<DolarApiResponse> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );

  try {
    const response =
      await fetch(url, {
        signal:
          controller.signal,

        headers: {
          Accept:
            "application/json",
        },
      });

    if (!response.ok) {
      throw new Error(
        `DolarApi respondió con estado ${response.status}`
      );
    }

    return (await response.json()) as DolarApiResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeBcvRates(): Promise<{
  usd: number | null;
  eur: number | null;
}> {
  const usdUrl =
    "https://ve.dolarapi.com/v1/dolares/oficial";

  const eurUrl =
    "https://ve.dolarapi.com/v1/euros/oficial";

  const [usdResult, eurResult] =
    await Promise.allSettled([
      fetchJsonWithTimeout(
        usdUrl
      ),

      fetchJsonWithTimeout(
        eurUrl
      ),
    ]);

  let usd: number | null =
    null;

  let eur: number | null =
    null;

  /*
   * USD
   */
  if (
    usdResult.status ===
    "fulfilled"
  ) {
    const value =
      Number(
        usdResult.value
          .promedio
      );

    if (
      Number.isFinite(value) &&
      value > 0
    ) {
      usd =
        Math.round(
          value * 100
        ) / 100;
    }
  } else {
    console.error(
      "Error consultando tasa USD:",
      usdResult.reason
    );
  }

  /*
   * EUR
   */
  if (
    eurResult.status ===
    "fulfilled"
  ) {
    const value =
      Number(
        eurResult.value
          .promedio
      );

    if (
      Number.isFinite(value) &&
      value > 0
    ) {
      eur =
        Math.round(
          value * 100
        ) / 100;
    }
  } else {
    console.error(
      "Error consultando tasa EUR:",
      eurResult.reason
    );
  }

  return {
    usd,
    eur,
  };
}

/*
 * Consulta DolarApi y guarda UNA sola entrada con las dos monedas.
 *
 * Esto evita el problema que ocurría al arrancar la aplicación:
 * el frontend podía leer primero una tasa EUR antigua (por ejemplo
 * 835.66) y solamente después terminar la actualización en segundo
 * plano.
 *
 * Cada consulta pública puede pedir una actualización fresca.
 */
async function refreshAndStoreRates(
  db: DatabaseSchema
): Promise<ExchangeRate> {
  const scraped = await scrapeBcvRates();
  const previous = getLatestExchangeRate(db);

  const usd =
    scraped.usd ??
    previous.rate_usd ??
    DEFAULT_USD_RATE;

  const eur =
    scraped.eur ??
    previous.rate_eur ??
    DEFAULT_EUR_RATE;

  const now = new Date();

  const rateEntry: ExchangeRate = {
    id:
      Math.max(
        0,
        ...db.exchange_rates.map(
          (record) => record.id || 0
        )
      ) + 1,

    rate_usd: usd,
    rate_eur: eur,

    rate_date: now
      .toISOString()
      .split("T")[0],

    source: "DolarApi - Oficial",
    created_at: now.toISOString(),
  };

  /*
   * Solo guardamos una nueva entrada cuando DolarApi respondió
   * al menos una de las dos monedas. Si ambas consultas fallan,
   * no fabricamos una actualización falsa.
   */
  if (
    scraped.usd !== null ||
    scraped.eur !== null
  ) {
    db.exchange_rates.push(rateEntry);
    writeDb(db);

    console.log(
      `Tasas DolarApi actualizadas: USD Bs ${rateEntry.rate_usd} | EUR Bs ${rateEntry.rate_eur}`
    );

    return rateEntry;
  }

  return previous;
}

/*
 * ============================================================
 * SERVIDOR
 * ============================================================
 */

async function startServer() {
  const app =
    express();

  app.use(
    cors({
      origin: true,

      allowedHeaders: [
        "Content-Type",
        "X-User-ID",
      ],

      methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
      ],
    })
  );

  app.use(
    express.json()
  );

  /*
   * ==========================================================
   * PRESUPUESTO
   * ==========================================================
   */

  app.get(
    [
      "/app-api/budget",
      "/api/budget",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      const budget =
        getOrCreateBudget(
          db,
          userId
        );

      recalculateSpentBs(
        db,
        userId,
        budget
      );

      writeDb(db);

      res.json(
        buildBudgetResponse(
          db,
          budget
        )
      );
    }
  );

  app.post(
    [
      "/app-api/budget",
      "/api/budget",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      const budget =
        getOrCreateBudget(
          db,
          userId
        );

      const {
        monto_bs,
        tipo_tasa,
        tasa_custom,
      } = req.body;

      if (
        monto_bs !==
        undefined
      ) {
        budget.monto_bs =
          Math.max(
            0,
            Number.parseFloat(
              monto_bs
            ) || 0
          );
      }

      if (
        tipo_tasa === "bcv" ||
        tipo_tasa === "custom"
      ) {
        budget.tipo_tasa =
          tipo_tasa;
      }

      if (
        tasa_custom !==
        undefined
      ) {
        budget.tasa_custom =
          Number.parseFloat(
            tasa_custom
          ) ||
          getLatestUsdRate(
            db
          );
      }

      budget.updated_at =
        new Date().toISOString();

      recalculateSpentBs(
        db,
        userId,
        budget
      );

      writeDb(db);

      res.json({
        success: true,

        budget:
          buildBudgetResponse(
            db,
            budget
          ),
      });
    }
  );

  /*
   * ==========================================================
   * CARRITO
   * ==========================================================
   */

  app.get(
    [
      "/app-api/cart",
      "/api/cart",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      const budget =
        getOrCreateBudget(
          db,
          userId
        );

      const items =
        getUserCart(
          db,
          userId
        ).map((item) => {
          /*
           * MUY IMPORTANTE:
           *
           * Se utiliza rate_used guardado en el producto.
           *
           * Así una compra EUR no vuelve a utilizar
           * la tasa USD actual.
           */
          const rate =
            item.rate_used ||
            getCurrencyRate(
              db,
              budget,
              item.currency
            );

          const priceBs =
            roundMoney(
              item.price_usd *
                rate
            );

          const subtotalUsd =
            roundMoney(
              item.price_usd *
                item.quantity
            );

          const subtotalBs =
            roundMoney(
              priceBs *
                item.quantity
            );

          return {
            ...item,

            currency:
              item.currency ||
              "USD",

            price_bs:
              priceBs,

            subtotal_usd:
              subtotalUsd,

            subtotal_bs:
              subtotalBs,

            rate_used:
              rate,
          };
        });

      const totalUsd =
        roundMoney(
          items.reduce(
            (sum, item) =>
              sum +
              item.subtotal_usd,
            0
          )
        );

      const totalBs =
        roundMoney(
          items.reduce(
            (sum, item) =>
              sum +
              item.subtotal_bs,
            0
          )
        );

      budget.spent_bs =
        totalBs;

      writeDb(db);

      /*
       * Para compatibilidad con el frontend:
       *
       * active_rate representa la tasa del primer
       * producto si existe.
       *
       * En una compra normal todos los productos
       * utilizan la misma moneda seleccionada.
       */
      const activeRate =
        items[0]?.rate_used ||
        getActiveRate(
          db,
          budget
        );

      res.json({
        items,

        total_items:
          items.reduce(
            (sum, item) =>
              sum +
              item.quantity,
            0
          ),

        total_usd:
          totalUsd,

        total_bs:
          totalBs,

        active_rate:
          activeRate,

        remaining_bs:
          Math.max(
            0,
            roundMoney(
              budget.monto_bs -
                totalBs
            )
          ),
      });
    }
  );

  app.post(
    [
      "/app-api/cart",
      "/api/cart",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      const budget =
        getOrCreateBudget(
          db,
          userId
        );

      const {
        name,
        price_usd,
        quantity,
        currency,
      } = req.body;

      const selectedCurrency: Currency =
        currency === "EUR"
          ? "EUR"
          : "USD";

      /*
       * AQUÍ SE CAPTURA LA TASA CORRECTA.
       *
       * EUR -> rate_eur
       * USD -> rate_usd
       */
      const rateUsed =
        getCurrencyRate(
          db,
          budget,
          selectedCurrency
        );

      const newItem: CartItem = {
        id:
          db.next_cart_id++,

        user_id:
          userId,

        name:
          name?.trim() ||
          "Producto sin nombre",

        price_usd:
          Number.parseFloat(
            price_usd
          ) || 0,

        currency:
          selectedCurrency,

        quantity:
          Math.max(
            1,
            Number.parseInt(
              quantity,
              10
            ) || 1
          ),

        rate_used:
          rateUsed,

        created_at:
          new Date().toISOString(),
      };

      db.cart_items.push(
        newItem
      );

      recalculateSpentBs(
        db,
        userId,
        budget
      );

      writeDb(db);

      res.json({
        success: true,
        item: newItem,
      });
    }
  );

  app.put(
    [
      "/app-api/cart/:id",
      "/api/cart/:id",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      const id =
        Number.parseInt(
          req.params.id,
          10
        );

      const quantity =
        Math.max(
          1,
          Number.parseInt(
            req.body.quantity,
            10
          ) || 1
        );

      const item =
        db.cart_items.find(
          (cartItem) =>
            cartItem.id ===
              id &&
            cartItem.user_id ===
              userId
        );

      if (!item) {
        return res
          .status(404)
          .json({
            error:
              "Producto no encontrado",
          });
      }

      item.quantity =
        quantity;

      const budget =
        getOrCreateBudget(
          db,
          userId
        );

      recalculateSpentBs(
        db,
        userId,
        budget
      );

      writeDb(db);

      return res.json({
        success: true,
        item,
      });
    }
  );

  app.delete(
    [
      "/app-api/cart/:id",
      "/api/cart/:id",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      const id =
        Number.parseInt(
          req.params.id,
          10
        );

      const originalLength =
        db.cart_items.length;

      db.cart_items =
        db.cart_items.filter(
          (item) =>
            !(
              item.id === id &&
              item.user_id ===
                userId
            )
        );

      if (
        db.cart_items.length ===
        originalLength
      ) {
        return res
          .status(404)
          .json({
            error:
              "Producto no encontrado",
          });
      }

      const budget =
        getOrCreateBudget(
          db,
          userId
        );

      recalculateSpentBs(
        db,
        userId,
        budget
      );

      writeDb(db);

      return res.json({
        success: true,
      });
    }
  );

  app.delete(
    [
      "/app-api/cart",
      "/api/cart",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      db.cart_items =
        db.cart_items.filter(
          (item) =>
            item.user_id !==
            userId
        );

      const budget =
        getOrCreateBudget(
          db,
          userId
        );

      recalculateSpentBs(
        db,
        userId,
        budget
      );

      writeDb(db);

      res.json({
        success: true,
      });
    }
  );

  /*
   * ==========================================================
   * CHECKOUT
   * ==========================================================
   */

  app.post(
    [
      "/app-api/cart/checkout",
      "/api/cart/checkout",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      const budget =
        getOrCreateBudget(
          db,
          userId
        );

      const cartItems =
        getUserCart(
          db,
          userId
        );

      if (
        cartItems.length ===
        0
      ) {
        return res
          .status(400)
          .json({
            error:
              "El carrito está vacío",
          });
      }

      /*
       * Cada producto conserva su propia tasa.
       */
      const items =
        cartItems.map(
          (item) => {
            const rate =
              item.rate_used ||
              getCurrencyRate(
                db,
                budget,
                item.currency
              );

            const priceBs =
              roundMoney(
                item.price_usd *
                  rate
              );

            const subtotalUsd =
              roundMoney(
                item.price_usd *
                  item.quantity
              );

            const subtotalBs =
              roundMoney(
                priceBs *
                  item.quantity
              );

            return {
              name:
                item.name,

              price_usd:
                item.price_usd,

              currency:
                item.currency ||
                "USD",

              price_bs:
                priceBs,

              quantity:
                item.quantity,

              subtotal_usd:
                subtotalUsd,

              subtotal_bs:
                subtotalBs,

              rate_used:
                rate,
            };
          }
        );

      const totalUsd =
        roundMoney(
          items.reduce(
            (sum, item) =>
              sum +
              item.subtotal_usd,
            0
          )
        );

      const totalBs =
        roundMoney(
          items.reduce(
            (sum, item) =>
              sum +
              item.subtotal_bs,
            0
          )
        );

      const remainingBs =
        Math.max(
          0,
          roundMoney(
            budget.monto_bs -
              totalBs
          )
        );

      const checkoutAt =
        new Date().toISOString();

      /*
       * Para una compra normal de una sola moneda,
       * esta será exactamente la tasa utilizada.
       *
       * Si posteriormente se permitieran productos
       * mezclados USD/EUR, cada item conserva además
       * su propia rate_used.
       */
      const historyRate =
        items[0]?.rate_used ||
        getActiveRate(
          db,
          budget
        );

      const record:
        HistoryRecord = {
        id:
          db.next_history_id++,

        user_id:
          userId,

        date:
          checkoutAt,

        total_bs:
          totalBs,

        total_usd:
          totalUsd,

        rate_used:
          historyRate,

        budget_bs:
          budget.monto_bs,

        remaining_bs:
          remainingBs,

        items,

        created_at:
          checkoutAt,
      };

      db.shopping_history.push(
        record
      );

      db.cart_items =
        db.cart_items.filter(
          (item) =>
            item.user_id !==
            userId
        );

      budget.monto_bs =
        remainingBs;

      budget.spent_bs =
        0;

      budget.updated_at =
        checkoutAt;

      writeDb(db);

      return res.json({
        success: true,

        record,

        budget:
          buildBudgetResponse(
            db,
            budget
          ),
      });
    }
  );

  /*
   * ==========================================================
   * HISTORIAL
   * ==========================================================
   */

  app.get(
    [
      "/app-api/history",
      "/api/history",
    ],
    (req, res) => {
      const db =
        readDb();

      const userId =
        getUserId(req);

      const history =
        db.shopping_history
          .filter(
            (record) =>
              record.user_id ===
              userId
          )
          .sort(
            (a, b) =>
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
          );

      res.json(
        history
      );
    }
  );

  /*
   * ==========================================================
   * PRECIOS COMUNITARIOS
   * ==========================================================
   */

  app.get(
    [
      "/app-api/community-prices",
      "/api/community-prices",
    ],
    (req, res) => {
      const db =
        readDb();

      const product =
        String(
          req.query.product ||
            ""
        ).toLowerCase();

      const city =
        String(
          req.query.city ||
            ""
        ).toLowerCase();

      const state =
        String(
          req.query.state ||
            ""
        ).toLowerCase();

      const sort =
        String(
          req.query.sort ||
            "newest"
        );

      let prices =
        [...db.community_prices];

      if (product) {
        prices =
          prices.filter(
            (price) =>
              normalizeProductKey(
                price.product
              ).includes(
                product
              )
          );
      }

      if (city) {
        prices =
          prices.filter(
            (price) =>
              normalizeProductKey(
                price.city
              ).includes(
                city
              )
          );
      }

      if (state) {
        prices =
          prices.filter(
            (price) =>
              normalizeProductKey(
                price.state
              ).includes(
                state
              )
          );
      }

      if (
        sort ===
        "price_asc"
      ) {
        prices.sort(
          (a, b) =>
            a.price_usd -
            b.price_usd
        );
      } else if (
        sort ===
        "price_desc"
      ) {
        prices.sort(
          (a, b) =>
            b.price_usd -
            a.price_usd
        );
      } else {
        prices.sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        );
      }

      res.json(
        prices
      );
    }
  );

  app.get(
    [
      "/app-api/community-prices/grouped",
      "/api/community-prices/grouped",
    ],
    (req, res) => {
      const db =
        readDb();

      const product =
        normalizeProductKey(
          String(
            req.query.product ||
              ""
          )
        );

      const city =
        normalizeProductKey(
          String(
            req.query.city ||
              ""
          )
        );

      const state =
        normalizeProductKey(
          String(
            req.query.state ||
              ""
          )
        );

      const sort =
        String(
          req.query.sort ||
            "recent"
        );

      let prices =
        [...db.community_prices];

      if (product) {
        prices =
          prices.filter(
            (price) =>
              normalizeProductKey(
                price.product
              ).includes(
                product
              )
          );
      }

      if (city) {
        prices =
          prices.filter(
            (price) =>
              normalizeProductKey(
                price.city
              ).includes(
                city
              )
          );
      }

      if (state) {
        prices =
          prices.filter(
            (price) =>
              normalizeProductKey(
                price.state
              ).includes(
                state
              )
          );
      }

      const groups =
        groupCommunityPrices(
          prices
        );

      if (
        sort ===
        "price_asc"
      ) {
        groups.sort(
          (a, b) =>
            a.lowest_price_usd -
            b.lowest_price_usd
        );
      } else if (
        sort ===
        "price_desc"
      ) {
        groups.sort(
          (a, b) =>
            b.lowest_price_usd -
            a.lowest_price_usd
        );
      } else {
        groups.sort(
          (a, b) =>
            new Date(
              b.latest_report_at
            ).getTime() -
            new Date(
              a.latest_report_at
            ).getTime()
        );
      }

      res.json(
        groups
      );
    }
  );

  app.post(
    [
      "/app-api/community-prices",
      "/api/community-prices",
    ],
    (req, res) => {
      const db =
        readDb();

      const {
        product,
        price_usd,
        supermarket,
        city,
        state,
        user_name,
      } = req.body;

      const priceUsd =
        Number.parseFloat(
          price_usd
        ) || 0;

      /*
       * Los precios comunitarios continúan utilizando
       * la tasa USD, tal como funcionaba anteriormente.
       */
      const activeRate =
        getLatestUsdRate(
          db
        );

      const newPrice:
        CommunityPrice = {
        id:
          db.next_community_id++,

        product:
          product?.trim() ||
          "Producto sin nombre",

        price_usd:
          priceUsd,

        price_bs:
          roundMoney(
            priceUsd *
              activeRate
          ),

        supermarket:
          supermarket?.trim() ||
          "No especificado",

        city:
          city?.trim() ||
          "No especificada",

        state:
          state?.trim() ||
          "No especificado",

        user_name:
          user_name?.trim() ||
          "Anónimo",

        created_at:
          new Date().toISOString(),
      };

      db.community_prices.push(
        newPrice
      );

      writeDb(db);

      res.json({
        success: true,
        price: newPrice,
      });
    }
  );

  /*
   * ==========================================================
   * TASA DE CAMBIO - CONSULTA PÚBLICA
   * ==========================================================
   *
   * Compatibilidad:
   *
   * GET /exchange-rate-public
   * GET /exchange-rate-public?currency=USD
   * GET /exchange-rate-public?currency=EUR
   *
   * La respuesta incluye ambas tasas.
   *
   * "rate" corresponde a la moneda solicitada.
   */

  app.get(
    [
      "/app-api/exchange-rate-public",
      "/api/exchange-rate-public",
    ],
    async (req, res) => {
      try {
        const db = readDb();

        /*
         * IMPORTANTE:
         *
         * No devolvemos directamente el último registro guardado.
         * Al abrir Rinde+ podía existir una tasa EUR antigua en
         * db_rinde.json y el frontend la recibía antes de que la
         * actualización automática terminara.
         *
         * Ahora la consulta pública actualiza primero USD y EUR
         * desde DolarApi - Oficial y luego responde.
         */
        const latest =
          await refreshAndStoreRates(db);

        const requestedCurrency =
          String(
            req.query.currency ||
              "USD"
          ).toUpperCase();

        const currency: Currency =
          requestedCurrency === "EUR"
            ? "EUR"
            : "USD";

        const selectedRate =
          currency === "EUR"
            ? latest.rate_eur
            : latest.rate_usd;

        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate"
        );

        return res.json({
          success: true,

          /* Tasa correspondiente a la moneda solicitada. */
          rate: selectedRate,

          /* Ambas tasas para las versiones nuevas de api.ts. */
          rate_usd: latest.rate_usd,
          rate_eur: latest.rate_eur,

          usd: latest.rate_usd,
          eur: latest.rate_eur,

          currency,
          date: latest.rate_date,
          source: latest.source,
          last_updated: latest.created_at,
        });
      } catch (error) {
        console.error(
          "Error obteniendo tasas desde DolarApi:",
          error
        );

        /*
         * Si DolarApi no responde, devolvemos la última tasa
         * persistida para que la aplicación siga funcionando.
         */
        const db = readDb();
        const latest =
          getLatestExchangeRate(db);

        const requestedCurrency =
          String(
            req.query.currency ||
              "USD"
          ).toUpperCase();

        const currency: Currency =
          requestedCurrency === "EUR"
            ? "EUR"
            : "USD";

        const selectedRate =
          currency === "EUR"
            ? latest.rate_eur
            : latest.rate_usd;

        res.setHeader(
          "Cache-Control",
          "no-store"
        );

        return res.json({
          success: false,
          rate: selectedRate,
          rate_usd: latest.rate_usd,
          rate_eur: latest.rate_eur,
          usd: latest.rate_usd,
          eur: latest.rate_eur,
          currency,
          date: latest.rate_date,
          source: latest.source,
          last_updated: latest.created_at,
          fallback: true,
        });
      }
    }
  );

  /*
   * ==========================================================
   * ACTUALIZAR TASAS BCV
   * ==========================================================
   *
   * Obtiene USD y EUR INDEPENDIENTEMENTE.
   */

  app.post(
    [
      "/app-api/exchange-rate/fetch",
      "/api/exchange-rate/fetch",
    ],
    async (req, res) => {
      try {
        const db = readDb();
        const latest =
          await refreshAndStoreRates(db);

        res.setHeader(
          "Cache-Control",
          "no-store"
        );

        return res.json({
          success: true,
          rate: latest.rate_usd,
          rate_usd: latest.rate_usd,
          rate_eur: latest.rate_eur,
          usd: latest.rate_usd,
          eur: latest.rate_eur,
          date: latest.rate_date,
          source: latest.source,
        });
      } catch (error) {
        console.error(
          "Error actualizando tasas desde DolarApi:",
          error
        );

        const db = readDb();
        const latest =
          getLatestExchangeRate(db);

        return res.status(503).json({
          success: false,
          error:
            "No fue posible actualizar las tasas desde DolarApi.",
          rate: latest.rate_usd,
          rate_usd: latest.rate_usd,
          rate_eur: latest.rate_eur,
          usd: latest.rate_usd,
          eur: latest.rate_eur,
          date: latest.rate_date,
          source: latest.source,
        });
      }
    }
  );

  /*
   * ==========================================================
   * ACTUALIZACIÓN AUTOMÁTICA INICIAL
   * ==========================================================
   *
   * Se ejecuta en segundo plano.
   *
   * NO bloquea el arranque del servidor.
   *
   * Esto permite que, al arrancar Rinde+, el servidor
   * pueda actualizar USD y EUR sin obligar a la interfaz
   * a esperar.
   */

  void (async () => {
    try {
      console.log(
        "Actualizando tasas DolarApi USD/EUR en segundo plano..."
      );

      const db = readDb();
      await refreshAndStoreRates(db);
    } catch (error) {
      console.error(
        "Error en actualización automática de tasas DolarApi:",
        error
      );
    }
  })();

  /*
   * ==========================================================
   * VITE / PRODUCCIÓN
   * ==========================================================
   */

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode:
            true,
        },

        appType:
          "custom",
      });

    app.use(
      vite.middlewares
    );
  } else {
    app.use(
      express.static(
        path.join(
          process.cwd(),
          "dist"
        )
      )
    );

    app.get(
      "*",
      (req, res) => {
        res.sendFile(
          path.join(
            process.cwd(),
            "dist",
            "index.html"
          )
        );
      }
    );
  }

  app.listen(
    PORT,
    () => {
      console.log(
        `Servidor corriendo en el puerto ${PORT}`
      );
    }
  );
}

startServer();