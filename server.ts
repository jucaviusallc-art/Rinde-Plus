import cors from "cors";
import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(process.cwd(), "db_rinde.json");
const DEFAULT_RATE = 742.23;
const DEFAULT_USER_ID = "user_default";

type RateType = "bcv" | "custom";

interface Budget {
  id: number;
  user_id: string;
  monto_bs: number;
  tipo_tasa: RateType;
  tasa_custom: number;
  spent_bs: number;
  updated_at: string;
}

interface CartItem {
  id: number;
  user_id: string;
  name: string;
  price_usd: number;
  quantity: number;
  rate_used: number;
  created_at: string;
}

interface SnapshotItem {
  name: string;
  price_usd: number;
  price_bs: number;
  quantity: number;
  subtotal_usd: number;
  subtotal_bs: number;
}

interface HistoryRecord {
  id: number;
  user_id: string;
  date: string;
  total_bs: number;
  total_usd: number;
  rate_used: number;
  budget_bs: number;
  remaining_bs: number;
  items: SnapshotItem[];
  created_at: string;
}

interface CommunityPrice {
  id: number;
  user_id?: string;
  product: string;
  price_usd: number;
  price_bs: number;
  supermarket: string;
  city: string;
  state: string;
  user_name: string;
  rate_used?: number;
  created_at: string;
}

interface ExchangeRate {
  id: number;
  rate_usd: number;
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
  next_exchange_rate_id: number;
}

interface LegacyDatabaseSchema {
  budget?: Budget;
  budgets?: Budget[];
  cart_items?: CartItem[];
  shopping_history?: HistoryRecord[];
  community_prices?: CommunityPrice[];
  exchange_rates?: ExchangeRate[];
  next_budget_id?: number;
  next_cart_id?: number;
  next_history_id?: number;
  next_community_id?: number;
  next_exchange_rate_id?: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function positiveNumber(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function nonNegativeNumber(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function createDefaultDb(): DatabaseSchema {
  const now = new Date().toISOString();

  return {
    budgets: [],
    cart_items: [],
    shopping_history: [],
    community_prices: [],
    exchange_rates: [
      {
        id: 1,
        rate_usd: DEFAULT_RATE,
        rate_date: now.split("T")[0],
        source: "Banco Central de Venezuela (BCV)",
        created_at: now,
      },
    ],
    next_budget_id: 1,
    next_cart_id: 1,
    next_history_id: 1,
    next_community_id: 1,
    next_exchange_rate_id: 2,
  };
}

function calculateNextId(items: Array<{ id: number }>): number {
  const highestId = items.reduce((highest, item) => {
    return Math.max(highest, Number(item.id) || 0);
  }, 0);

  return highestId + 1;
}

function migrateDatabase(raw: LegacyDatabaseSchema): DatabaseSchema {
  const fallback = createDefaultDb();

  let budgets: Budget[] = [];

  if (Array.isArray(raw.budgets)) {
    budgets = raw.budgets;
  } else if (raw.budget && typeof raw.budget === "object") {
    budgets = [
      {
        ...raw.budget,
        user_id: raw.budget.user_id || DEFAULT_USER_ID,
      },
    ];
  }

  const cartItems = Array.isArray(raw.cart_items)
    ? raw.cart_items.map((item) => ({
        ...item,
        user_id: item.user_id || DEFAULT_USER_ID,
      }))
    : [];

  const shoppingHistory = Array.isArray(raw.shopping_history)
    ? raw.shopping_history.map((record) => ({
        ...record,
        user_id: record.user_id || DEFAULT_USER_ID,
      }))
    : [];

  const communityPrices = Array.isArray(raw.community_prices)
    ? raw.community_prices
    : [];

  const exchangeRates =
    Array.isArray(raw.exchange_rates) && raw.exchange_rates.length > 0
      ? raw.exchange_rates
      : fallback.exchange_rates;

  return {
    budgets,
    cart_items: cartItems,
    shopping_history: shoppingHistory,
    community_prices: communityPrices,
    exchange_rates: exchangeRates,
    next_budget_id: Math.max(
      Number(raw.next_budget_id) || 1,
      calculateNextId(budgets)
    ),
    next_cart_id: Math.max(
      Number(raw.next_cart_id) || 1,
      calculateNextId(cartItems)
    ),
    next_history_id: Math.max(
      Number(raw.next_history_id) || 1,
      calculateNextId(shoppingHistory)
    ),
    next_community_id: Math.max(
      Number(raw.next_community_id) || 1,
      calculateNextId(communityPrices)
    ),
    next_exchange_rate_id: Math.max(
      Number(raw.next_exchange_rate_id) || 1,
      calculateNextId(exchangeRates)
    ),
  };
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const newDb = createDefaultDb();
      writeDb(newDb);
      return newDb;
    }

    const fileContent = fs.readFileSync(DB_FILE, "utf-8").trim();

    if (!fileContent) {
      const newDb = createDefaultDb();
      writeDb(newDb);
      return newDb;
    }

    const parsed = JSON.parse(fileContent) as LegacyDatabaseSchema;
    const migrated = migrateDatabase(parsed);

    return migrated;
  } catch (error) {
    console.error("Error leyendo db_rinde.json:", error);

    const fallback = createDefaultDb();

    try {
      writeDb(fallback);
    } catch {
      // El error original ya fue registrado.
    }

    return fallback;
  }
}

function writeDb(db: DatabaseSchema): void {
  const temporaryFile = `${DB_FILE}.tmp`;

  fs.writeFileSync(
    temporaryFile,
    JSON.stringify(db, null, 2),
    "utf-8"
  );

  fs.renameSync(temporaryFile, DB_FILE);
}

function getUserId(req: Request): string {
  const rawHeader = req.headers["x-user-id"];
  const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const sanitized = String(headerValue || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 150);

  return sanitized || DEFAULT_USER_ID;
}

function getLatestRate(db: DatabaseSchema): number {
  const latestRecord = db.exchange_rates[db.exchange_rates.length - 1];
  const rate = Number(latestRecord?.rate_usd);

  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_RATE;
}

function getOrCreateBudget(
  db: DatabaseSchema,
  userId: string
): Budget {
  let budget = db.budgets.find((entry) => entry.user_id === userId);

  if (!budget) {
    budget = {
      id: db.next_budget_id++,
      user_id: userId,
      monto_bs: 0,
      tipo_tasa: "bcv",
      tasa_custom: DEFAULT_RATE,
      spent_bs: 0,
      updated_at: new Date().toISOString(),
    };

    db.budgets.push(budget);
  }

  return budget;
}

function getActiveRate(
  db: DatabaseSchema,
  budget: Budget
): number {
  if (
    budget.tipo_tasa === "custom" &&
    Number.isFinite(budget.tasa_custom) &&
    budget.tasa_custom > 0
  ) {
    return budget.tasa_custom;
  }

  return getLatestRate(db);
}

function getUserCart(
  db: DatabaseSchema,
  userId: string
): CartItem[] {
  return db.cart_items.filter((item) => item.user_id === userId);
}

function recalculateUserSpent(
  db: DatabaseSchema,
  userId: string
): number {
  const budget = getOrCreateBudget(db, userId);
  const activeRate = getActiveRate(db, budget);
  const userCart = getUserCart(db, userId);

  const spent = userCart.reduce((total, item) => {
    const itemRate =
      Number.isFinite(item.rate_used) && item.rate_used > 0
        ? item.rate_used
        : activeRate;

    return total + item.price_usd * item.quantity * itemRate;
  }, 0);

  budget.spent_bs = roundMoney(spent);
  budget.updated_at = new Date().toISOString();

  return budget.spent_bs;
}

function serializeBudget(
  db: DatabaseSchema,
  budget: Budget
) {
  const activeRate = getActiveRate(db, budget);
  const safeRate = activeRate > 0 ? activeRate : DEFAULT_RATE;
  const remainingBs = roundMoney(
    Math.max(0, budget.monto_bs - budget.spent_bs)
  );

  return {
    ...budget,
    active_rate: safeRate,
    remaining_bs: remainingBs,
    budget_usd: roundMoney(budget.monto_bs / safeRate),
    spent_usd: roundMoney(budget.spent_bs / safeRate),
    remaining_usd: roundMoney(remainingBs / safeRate),
    percentage_remaining:
      budget.monto_bs > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round((remainingBs / budget.monto_bs) * 100)
            )
          )
        : 0,
  };
}

function buildCartSummary(
  db: DatabaseSchema,
  userId: string
) {
  const budget = getOrCreateBudget(db, userId);
  const activeRate = getActiveRate(db, budget);
  const items = getUserCart(db, userId);

  const serializedItems = items.map((item) => {
    const itemRate =
      Number.isFinite(item.rate_used) && item.rate_used > 0
        ? item.rate_used
        : activeRate;

    const subtotalUsd = roundMoney(
      item.price_usd * item.quantity
    );

    const priceBs = roundMoney(item.price_usd * itemRate);
    const subtotalBs = roundMoney(subtotalUsd * itemRate);

    return {
      ...item,
      price_bs: priceBs,
      subtotal_usd: subtotalUsd,
      subtotal_bs: subtotalBs,
    };
  });

  const totalItems = serializedItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalUsd = roundMoney(
    serializedItems.reduce(
      (total, item) => total + item.subtotal_usd,
      0
    )
  );

  const totalBs = roundMoney(
    serializedItems.reduce(
      (total, item) => total + item.subtotal_bs,
      0
    )
  );

  budget.spent_bs = totalBs;

  return {
    items: serializedItems,
    total_items: totalItems,
    total_usd: totalUsd,
    total_bs: totalBs,
    active_rate: activeRate,
    remaining_bs: roundMoney(
      Math.max(0, budget.monto_bs - totalBs)
    ),
  };
}

async function scrapeBcvRate(): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      "https://ve.dolarapi.com/v1/dolares/oficial",
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `DolarApi respondió con estado ${response.status}`
      );
    }

    const data = (await response.json()) as {
      promedio?: number;
    };

    const rate = Number(data.promedio);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("La API devolvió una tasa inválida");
    }

    return roundMoney(rate);
  } catch (error) {
    console.error("Error consultando la tasa oficial:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: false,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-User-ID"],
    })
  );

  app.use(express.json({ limit: "1mb" }));

  app.get(
    ["/app-api/health", "/api/health"],
    (_req: Request, res: Response) => {
      res.json({
        success: true,
        service: "Rinde+ API",
        time: new Date().toISOString(),
      });
    }
  );

  // PRESUPUESTO

  app.get(
    ["/app-api/budget", "/api/budget"],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);
        const budget = getOrCreateBudget(db, userId);

        recalculateUserSpent(db, userId);
        writeDb(db);

        res.json(serializeBudget(db, budget));
      } catch (error) {
        console.error("Error obteniendo presupuesto:", error);
        res.status(500).json({
          error: "No se pudo obtener el presupuesto.",
        });
      }
    }
  );

  app.post(
    ["/app-api/budget", "/api/budget"],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);
        const budget = getOrCreateBudget(db, userId);

        const montoBs = nonNegativeNumber(req.body?.monto_bs);
        const tasaCustom = positiveNumber(req.body?.tasa_custom);
        const tipoTasa = req.body?.tipo_tasa;

        if (montoBs === null) {
          res.status(400).json({
            error: "El presupuesto debe ser un número válido.",
          });
          return;
        }

        if (tipoTasa !== "bcv" && tipoTasa !== "custom") {
          res.status(400).json({
            error: "El tipo de tasa no es válido.",
          });
          return;
        }

        if (tipoTasa === "custom" && tasaCustom === null) {
          res.status(400).json({
            error: "La tasa personalizada debe ser mayor a cero.",
          });
          return;
        }

        budget.monto_bs = roundMoney(montoBs);
        budget.tipo_tasa = tipoTasa;
        budget.tasa_custom =
          tasaCustom !== null ? roundMoney(tasaCustom) : DEFAULT_RATE;
        budget.updated_at = new Date().toISOString();

        recalculateUserSpent(db, userId);
        writeDb(db);

        res.json({
          success: true,
          budget: serializeBudget(db, budget),
        });
      } catch (error) {
        console.error("Error guardando presupuesto:", error);
        res.status(500).json({
          error: "No se pudo guardar el presupuesto.",
        });
      }
    }
  );

  // TASA DE CAMBIO

  app.get(
    [
      "/app-api/exchange-rate-public",
      "/api/exchange-rate-public",
    ],
    (_req: Request, res: Response) => {
      try {
        const db = readDb();

        const latest =
          db.exchange_rates[db.exchange_rates.length - 1] ||
          createDefaultDb().exchange_rates[0];

        res.json({
          rate: latest.rate_usd,
          date: latest.rate_date,
          source: latest.source,
          last_updated: latest.created_at,
        });
      } catch (error) {
        console.error("Error obteniendo la tasa:", error);
        res.status(500).json({
          error: "No se pudo obtener la tasa de cambio.",
        });
      }
    }
  );

  app.post(
    [
      "/app-api/exchange-rate/fetch",
      "/api/exchange-rate/fetch",
    ],
    async (_req: Request, res: Response) => {
      try {
        const db = readDb();
        const scrapedRate = await scrapeBcvRate();

        if (scrapedRate !== null) {
          db.exchange_rates.push({
            id: db.next_exchange_rate_id++,
            rate_usd: scrapedRate,
            rate_date: new Date().toISOString().split("T")[0],
            source: "DolarApi - Oficial",
            created_at: new Date().toISOString(),
          });

          writeDb(db);
        }

        const latest =
          db.exchange_rates[db.exchange_rates.length - 1] ||
          createDefaultDb().exchange_rates[0];

        res.json({
          success: true,
          scraped: scrapedRate !== null,
          rate: latest.rate_usd,
          date: latest.rate_date,
          source: latest.source,
          last_updated: latest.created_at,
        });
      } catch (error) {
        console.error("Error actualizando la tasa:", error);
        res.status(500).json({
          error: "No se pudo actualizar la tasa de cambio.",
        });
      }
    }
  );

  // CARRITO

  app.get(
    ["/app-api/cart", "/api/cart"],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);
        const summary = buildCartSummary(db, userId);

        writeDb(db);
        res.json(summary);
      } catch (error) {
        console.error("Error obteniendo carrito:", error);
        res.status(500).json({
          error: "No se pudo obtener el carrito.",
        });
      }
    }
  );

  app.post(
    ["/app-api/cart", "/api/cart"],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);

        const name = String(req.body?.name || "").trim();
        const priceUsd = positiveNumber(req.body?.price_usd);
        const quantity = positiveInteger(req.body?.quantity);

        if (!name) {
          res.status(400).json({
            error: "El nombre del producto es obligatorio.",
          });
          return;
        }

        if (priceUsd === null) {
          res.status(400).json({
            error: "El precio debe ser mayor a cero.",
          });
          return;
        }

        if (quantity === null) {
          res.status(400).json({
            error: "La cantidad debe ser un número entero mayor a cero.",
          });
          return;
        }

        const budget = getOrCreateBudget(db, userId);
        const activeRate = getActiveRate(db, budget);

        const item: CartItem = {
          id: db.next_cart_id++,
          user_id: userId,
          name: name.slice(0, 150),
          price_usd: roundMoney(priceUsd),
          quantity,
          rate_used: activeRate,
          created_at: new Date().toISOString(),
        };

        db.cart_items.push(item);
        recalculateUserSpent(db, userId);
        writeDb(db);

        res.status(201).json({
          success: true,
          item,
          cart: buildCartSummary(db, userId),
        });
      } catch (error) {
        console.error("Error agregando producto:", error);
        res.status(500).json({
          error: "No se pudo agregar el producto al carrito.",
        });
      }
    }
  );

  app.put(
    ["/app-api/cart/:id", "/api/cart/:id"],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);
        const itemId = positiveInteger(req.params.id);
        const quantity = positiveInteger(req.body?.quantity);

        if (itemId === null) {
          res.status(400).json({
            error: "El producto indicado no es válido.",
          });
          return;
        }

        if (quantity === null) {
          res.status(400).json({
            error: "La cantidad debe ser mayor a cero.",
          });
          return;
        }

        const item = db.cart_items.find(
          (entry) =>
            entry.id === itemId && entry.user_id === userId
        );

        if (!item) {
          res.status(404).json({
            error: "El producto no existe en tu carrito.",
          });
          return;
        }

        item.quantity = quantity;

        recalculateUserSpent(db, userId);
        writeDb(db);

        res.json({
          success: true,
          item,
          cart: buildCartSummary(db, userId),
        });
      } catch (error) {
        console.error("Error actualizando producto:", error);
        res.status(500).json({
          error: "No se pudo actualizar el producto.",
        });
      }
    }
  );

  app.delete(
    ["/app-api/cart/:id", "/api/cart/:id"],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);
        const itemId = positiveInteger(req.params.id);

        if (itemId === null) {
          res.status(400).json({
            error: "El producto indicado no es válido.",
          });
          return;
        }

        const itemIndex = db.cart_items.findIndex(
          (entry) =>
            entry.id === itemId && entry.user_id === userId
        );

        if (itemIndex === -1) {
          res.status(404).json({
            error: "El producto no existe en tu carrito.",
          });
          return;
        }

        db.cart_items.splice(itemIndex, 1);

        recalculateUserSpent(db, userId);
        writeDb(db);

        res.json({
          success: true,
          cart: buildCartSummary(db, userId),
        });
      } catch (error) {
        console.error("Error eliminando producto:", error);
        res.status(500).json({
          error: "No se pudo eliminar el producto.",
        });
      }
    }
  );

  // CHECKOUT

  app.post(
    ["/app-api/cart/checkout", "/api/cart/checkout"],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);
        const budget = getOrCreateBudget(db, userId);
        const cart = buildCartSummary(db, userId);

        if (cart.items.length === 0) {
          res.status(400).json({
            error: "El carrito está vacío.",
          });
          return;
        }

        if (budget.monto_bs > 0 && cart.total_bs > budget.monto_bs) {
          res.status(400).json({
            error: "El total del carrito supera tu presupuesto.",
          });
          return;
        }

        const now = new Date();
        const record: HistoryRecord = {
          id: db.next_history_id++,
          user_id: userId,
          date: now.toISOString().split("T")[0],
          total_bs: cart.total_bs,
          total_usd: cart.total_usd,
          rate_used: cart.active_rate,
          budget_bs: budget.monto_bs,
          remaining_bs: roundMoney(
            Math.max(0, budget.monto_bs - cart.total_bs)
          ),
          items: cart.items.map((item) => ({
            name: item.name,
            price_usd: item.price_usd,
            price_bs: item.price_bs,
            quantity: item.quantity,
            subtotal_usd: item.subtotal_usd,
            subtotal_bs: item.subtotal_bs,
          })),
          created_at: now.toISOString(),
        };

        db.shopping_history.unshift(record);
        db.cart_items = db.cart_items.filter(
          (item) => item.user_id !== userId
        );

        budget.spent_bs = 0;
        budget.updated_at = now.toISOString();

        writeDb(db);

        res.json({
          success: true,
          record,
        });
      } catch (error) {
        console.error("Error procesando checkout:", error);
        res.status(500).json({
          error: "No se pudo completar la compra.",
        });
      }
    }
  );

  // HISTORIAL

  app.get(
    ["/app-api/history", "/api/history"],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);

        const history = db.shopping_history
          .filter((record) => record.user_id === userId)
          .sort((a, b) =>
            b.created_at.localeCompare(a.created_at)
          );

        res.json(history);
      } catch (error) {
        console.error("Error obteniendo historial:", error);
        res.status(500).json({
          error: "No se pudo obtener el historial.",
        });
      }
    }
  );

  // PRECIOS DE LA COMUNIDAD

  app.get(
    [
      "/app-api/community-prices",
      "/api/community-prices",
    ],
    (req: Request, res: Response) => {
      try {
        const db = readDb();

        const product = String(req.query.product || "")
          .trim()
          .toLowerCase();

        const city = String(req.query.city || "")
          .trim()
          .toLowerCase();

        const state = String(req.query.state || "")
          .trim()
          .toLowerCase();

        const sort = String(req.query.sort || "recent");

        let prices = [...db.community_prices];

        if (product) {
          prices = prices.filter((entry) =>
            entry.product.toLowerCase().includes(product)
          );
        }

        if (city) {
          prices = prices.filter((entry) =>
            entry.city.toLowerCase().includes(city)
          );
        }

        if (state) {
          prices = prices.filter((entry) =>
            entry.state.toLowerCase().includes(state)
          );
        }

        if (sort === "price_asc" || sort === "lowest") {
          prices.sort((a, b) => a.price_usd - b.price_usd);
        } else if (
          sort === "price_desc" ||
          sort === "highest"
        ) {
          prices.sort((a, b) => b.price_usd - a.price_usd);
        } else {
          prices.sort((a, b) =>
            b.created_at.localeCompare(a.created_at)
          );
        }

        res.json(prices);
      } catch (error) {
        console.error("Error obteniendo precios:", error);
        res.status(500).json({
          error: "No se pudieron obtener los precios.",
        });
      }
    }
  );

  app.post(
    [
      "/app-api/community-prices",
      "/api/community-prices",
    ],
    (req: Request, res: Response) => {
      try {
        const db = readDb();
        const userId = getUserId(req);

        const product = String(req.body?.product || "").trim();
        const supermarket = String(
          req.body?.supermarket || ""
        ).trim();
        const city = String(req.body?.city || "").trim();
        const state = String(req.body?.state || "").trim();
        const userName =
          String(req.body?.user_name || "").trim() ||
          "Usuario Rinde+";

        const priceUsd = positiveNumber(req.body?.price_usd);

        if (
          !product ||
          !supermarket ||
          !city ||
          !state ||
          priceUsd === null
        ) {
          res.status(400).json({
            error:
              "Completa el producto, precio, supermercado, ciudad y estado.",
          });
          return;
        }

        const budget = getOrCreateBudget(db, userId);
        const rate = getActiveRate(db, budget);

        const communityPrice: CommunityPrice = {
          id: db.next_community_id++,
          user_id: userId,
          product: product.slice(0, 150),
          price_usd: roundMoney(priceUsd),
          price_bs: roundMoney(priceUsd * rate),
          supermarket: supermarket.slice(0, 150),
          city: city.slice(0, 100),
          state: state.slice(0, 100),
          user_name: userName.slice(0, 100),
          rate_used: rate,
          created_at: new Date().toISOString(),
        };

        db.community_prices.unshift(communityPrice);
        writeDb(db);

        res.status(201).json({
          success: true,
          price: communityPrice,
        });
      } catch (error) {
        console.error("Error publicando precio:", error);
        res.status(500).json({
          error: "No se pudo publicar el precio.",
        });
      }
    }
  );

  // FRONTEND

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "custom",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use(
    (
      error: unknown,
      _req: Request,
      res: Response,
      _next: express.NextFunction
    ) => {
      console.error("Error no controlado:", error);

      res.status(500).json({
        error: "Ocurrió un error interno en el servidor.",
      });
    }
  );

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Rinde+ corriendo en el puerto ${PORT}`);
    console.log(`Base de datos: ${DB_FILE}`);
  });
}

startServer().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error);
  process.exit(1);
});