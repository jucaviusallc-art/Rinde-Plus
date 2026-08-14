import cors from "cors";
import express, { Request } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const PORT = process.env.PORT || 3000;
const DEFAULT_RATE = 742.23;

// Configuración de tu base de datos de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAb4kyXtkHenLqrZ-kaVuNKqqd70xRtG0",
  authDomain: "rinde-f7a8f.firebaseapp.com",
  projectId: "rinde-f7a8f",
  storageBucket: "rinde-f7a8f.firebasestorage.app",
  messagingSenderId: "800458362902",
  appId: "1:800458362902:web:da20414cfbf45652c52537",
  measurementId: "G-69DBHR7YSW"
};

const firebaseApp = initializeApp(firebaseConfig);
const dbFirestore = getFirestore(firebaseApp);

interface Budget {
  id: number;
  user_id: string;
  monto_bs: number;
  tipo_tasa: "bcv" | "custom";
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

interface HistoryRecord {
  id: number;
  user_id: string;
  date: string;
  total_bs: number;
  total_usd: number;
  rate_used: number;
  budget_bs: number;
  remaining_bs: number;
  items: Array<{
    name: string;
    price_usd: number;
    price_bs: number;
    quantity: number;
    subtotal_usd: number;
    subtotal_bs: number;
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
  offers: Array<CommunityPrice & { is_lowest: boolean }>;
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
}

function createEmptyDatabase(): DatabaseSchema {
  return {
    budgets: [],
    cart_items: [],
    shopping_history: [],
    community_prices: [],
    exchange_rates: [
      {
        id: 1,
        rate_usd: DEFAULT_RATE,
        rate_date: new Date().toISOString().split("T")[0],
        source: "Banco Central de Venezuela (BCV)",
        created_at: new Date().toISOString(),
      },
    ],
    next_budget_id: 1,
    next_cart_id: 1,
    next_history_id: 1,
    next_community_id: 1,
  };
}

function normalizeDatabase(raw: LegacyDatabaseSchema): DatabaseSchema {
  const budgets = Array.isArray(raw.budgets)
    ? raw.budgets
    : raw.budget
      ? [raw.budget]
      : [];

  const cartItems = Array.isArray(raw.cart_items) ? raw.cart_items : [];
  const history = Array.isArray(raw.shopping_history)
    ? raw.shopping_history
    : [];
  const communityPrices = Array.isArray(raw.community_prices)
    ? raw.community_prices
    : [];
  const exchangeRates =
    Array.isArray(raw.exchange_rates) && raw.exchange_rates.length > 0
      ? raw.exchange_rates
      : createEmptyDatabase().exchange_rates;

  return {
    budgets,
    cart_items: cartItems,
    shopping_history: history,
    community_prices: communityPrices,
    exchange_rates: exchangeRates,
    next_budget_id:
      raw.next_budget_id ??
      Math.max(0, ...budgets.map((budget) => budget.id || 0)) + 1,
    next_cart_id:
      raw.next_cart_id ??
      Math.max(0, ...cartItems.map((item) => item.id || 0)) + 1,
    next_history_id:
      raw.next_history_id ??
      Math.max(0, ...history.map((record) => record.id || 0)) + 1,
    next_community_id:
      raw.next_community_id ??
      Math.max(0, ...communityPrices.map((price) => price.id || 0)) + 1,
  };
}

async function readDb(): Promise<DatabaseSchema> {
  try {
    const docRef = doc(dbFirestore, "rinde_data", "main");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return normalizeDatabase(docSnap.data() as LegacyDatabaseSchema);
    }
  } catch (err) {
    console.error("Error leyendo de Firestore:", err);
  }

  return createEmptyDatabase();
}

async function writeDb(db: DatabaseSchema): Promise<void> {
  try {
    const docRef = doc(dbFirestore, "rinde_data", "main");
    await setDoc(docRef, db);
  } catch (err) {
    console.error("Error escribiendo en Firestore:", err);
  }
}

function getUserId(req: Request): string {
  const header = req.header("X-User-ID")?.trim();
  if (!header) {
    return "user_default";
  }
  return header.slice(0, 200);
}

function getLatestRate(db: DatabaseSchema): number {
  return (
    db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || DEFAULT_RATE
  );
}

function createBudget(db: DatabaseSchema, userId: string): Budget {
  const budget: Budget = {
    id: db.next_budget_id++,
    user_id: userId,
    monto_bs: 0,
    tipo_tasa: "bcv",
    tasa_custom: DEFAULT_RATE,
    spent_bs: 0,
    updated_at: new Date().toISOString(),
  };

  db.budgets.push(budget);
  return budget;
}

function getOrCreateBudget(db: DatabaseSchema, userId: string): Budget {
  return (
    db.budgets.find((budget) => budget.user_id === userId) ||
    createBudget(db, userId)
  );
}

function getActiveRate(db: DatabaseSchema, budget: Budget): number {
  return budget.tipo_tasa === "custom"
    ? budget.tasa_custom
    : getLatestRate(db);
}

function getUserCart(db: DatabaseSchema, userId: string): CartItem[] {
  return db.cart_items.filter((item) => item.user_id === userId);
}

function recalculateSpentBs(
  db: DatabaseSchema,
  userId: string,
  budget: Budget
): number {
  const activeRate = getActiveRate(db, budget);

  const totalBs = getUserCart(db, userId).reduce((acc, item) => {
    const rate = item.rate_used || activeRate;
    return acc + item.price_usd * item.quantity * rate;
  }, 0);

  const roundedSpent = Math.round(totalBs * 100) / 100;
  budget.spent_bs = roundedSpent;

  return roundedSpent;
}

function buildBudgetResponse(db: DatabaseSchema, budget: Budget) {
  const activeRate = getActiveRate(db, budget);
  const remainingBs = Math.max(
    0,
    Math.round((budget.monto_bs - budget.spent_bs) * 100) / 100
  );

  return {
    ...budget,
    active_rate: activeRate,
    remaining_bs: remainingBs,
    budget_usd: Math.round((budget.monto_bs / activeRate) * 100) / 100,
    spent_usd: Math.round((budget.spent_bs / activeRate) * 100) / 100,
    remaining_usd: Math.round((remainingBs / activeRate) * 100) / 100,
    percentage_remaining:
      budget.monto_bs > 0
        ? Math.max(
            0,
            Math.round(
              ((budget.monto_bs - budget.spent_bs) / budget.monto_bs) * 100
            )
          )
        : 0,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeProductKey(product: string): string {
  return product
    .trim()
    .toLocaleLowerCase("es-VE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function groupCommunityPrices(prices: CommunityPrice[]): CommunityPriceGroup[] {
  const grouped = new Map<string, CommunityPrice[]>();

  for (const price of prices) {
    const productKey = normalizeProductKey(price.product) || `product-${price.id}`;
    const cityKey = normalizeProductKey(price.city) || "city-unknown";
    const stateKey = normalizeProductKey(price.state) || "state-unknown";
    const key = `${productKey}|${cityKey}|${stateKey}`;
    const current = grouped.get(key) || [];
    current.push(price);
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map((group) => {
    const offersByPrice = [...group].sort((a, b) => {
      if (a.price_usd !== b.price_usd) {
        return a.price_usd - b.price_usd;
      }
      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });

    const lowestPriceUsd = offersByPrice[0]?.price_usd || 0;
    const usdTotal = group.reduce((sum, price) => sum + price.price_usd, 0);
    const bsTotal = group.reduce((sum, price) => sum + price.price_bs, 0);
    const latestReportAt = group.reduce(
      (latest, price) =>
        new Date(price.created_at).getTime() > new Date(latest).getTime()
          ? price.created_at
          : latest,
      group[0].created_at
    );

    return {
      product: group[0].product,
      city: group[0].city,
      state: group[0].state,
      lowest_price_usd: roundMoney(
        Math.min(...group.map((price) => price.price_usd))
      ),
      highest_price_usd: roundMoney(
        Math.max(...group.map((price) => price.price_usd))
      ),
      average_price_usd: roundMoney(usdTotal / group.length),
      lowest_price_bs: roundMoney(
        Math.min(...group.map((price) => price.price_bs))
      ),
      highest_price_bs: roundMoney(
        Math.max(...group.map((price) => price.price_bs))
      ),
      average_price_bs: roundMoney(bsTotal / group.length),
      reports: group.length,
      supermarkets: new Set(
        group.map((price) => price.supermarket.trim().toLocaleLowerCase("es-VE"))
      ).size,
      latest_report_at: latestReportAt,
      offers: offersByPrice.map((offer) => ({
        ...offer,
        is_lowest: offer.price_usd === lowestPriceUsd,
      })),
    };
  });
}

async function scrapeBcvRate(): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`DolarApi respondió con estado ${res.status}`);
    }

    const data = (await res.json()) as { promedio?: number };
    const rate = Number(data.promedio);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("La API devolvió una tasa inválida");
    }

    return Math.round(rate * 100) / 100;
  } catch (error) {
    console.error("Error al consultar la tasa oficial:", error);
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
      allowedHeaders: ["Content-Type", "X-User-ID"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );
  app.use(express.json());

  // --- PRESUPUESTO ---

  app.get(["/app-api/budget", "/api/budget"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);
    const budget = getOrCreateBudget(db, userId);

    recalculateSpentBs(db, userId, budget);
    await writeDb(db);

    res.json(buildBudgetResponse(db, budget));
  });

  app.post(["/app-api/budget", "/api/budget"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);
    const budget = getOrCreateBudget(db, userId);
    const { monto_bs, tipo_tasa, tasa_custom } = req.body;

    if (monto_bs !== undefined) {
      budget.monto_bs = Math.max(0, Number.parseFloat(monto_bs) || 0);
    }

    if (tipo_tasa === "bcv" || tipo_tasa === "custom") {
      budget.tipo_tasa = tipo_tasa;
    }

    if (tasa_custom !== undefined) {
      budget.tasa_custom =
        Number.parseFloat(tasa_custom) || getLatestRate(db);
    }

    budget.updated_at = new Date().toISOString();

    recalculateSpentBs(db, userId, budget);
    await writeDb(db);

    res.json({
      success: true,
      budget: buildBudgetResponse(db, budget),
    });
  });

  // --- CARRITO ---

  app.get(["/app-api/cart", "/api/cart"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);
    const budget = getOrCreateBudget(db, userId);
    const activeRate = getActiveRate(db, budget);

    const items = getUserCart(db, userId).map((item) => {
      const rate = item.rate_used || activeRate;
      const priceBs = Math.round(item.price_usd * rate * 100) / 100;
      const subtotalUsd =
        Math.round(item.price_usd * item.quantity * 100) / 100;
      const subtotalBs =
        Math.round(priceBs * item.quantity * 100) / 100;

      return {
        ...item,
        price_bs: priceBs,
        subtotal_usd: subtotalUsd,
        subtotal_bs: subtotalBs,
      };
    });

    const totalUsd =
      Math.round(
        items.reduce((sum, item) => sum + item.subtotal_usd, 0) * 100
      ) / 100;
    const totalBs =
      Math.round(
        items.reduce((sum, item) => sum + item.subtotal_bs, 0) * 100
      ) / 100;

    budget.spent_bs = totalBs;
    await writeDb(db);

    res.json({
      items,
      total_items: items.reduce((sum, item) => sum + item.quantity, 0),
      total_usd: totalUsd,
      total_bs: totalBs,
      active_rate: activeRate,
      remaining_bs: Math.max(
        0,
        Math.round((budget.monto_bs - totalBs) * 100) / 100
      ),
    });
  });

  app.post(["/app-api/cart", "/api/cart"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);
    const budget = getOrCreateBudget(db, userId);
    const { name, price_usd, quantity } = req.body;
    const activeRate = getActiveRate(db, budget);

    const newItem: CartItem = {
      id: db.next_cart_id++,
      user_id: userId,
      name: name?.trim() || "Producto sin nombre",
      price_usd: Number.parseFloat(price_usd) || 0,
      quantity: Math.max(1, Number.parseInt(quantity, 10) || 1),
      rate_used: activeRate,
      created_at: new Date().toISOString(),
    };

    db.cart_items.push(newItem);
    recalculateSpentBs(db, userId, budget);
    await writeDb(db);

    res.json({ success: true, item: newItem });
  });

  app.put(["/app-api/cart/:id", "/api/cart/:id"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);
    const id = Number.parseInt(req.params.id, 10);
    const quantity = Math.max(1, Number.parseInt(req.body.quantity, 10) || 1);

    const item = db.cart_items.find(
      (cartItem) => cartItem.id === id && cartItem.user_id === userId
    );

    if (!item) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    item.quantity = quantity;

    const budget = getOrCreateBudget(db, userId);
    recalculateSpentBs(db, userId, budget);
    await writeDb(db);

    return res.json({ success: true, item });
  });

  app.delete(["/app-api/cart/:id", "/api/cart/:id"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);
    const id = Number.parseInt(req.params.id, 10);
    const originalLength = db.cart_items.length;

    db.cart_items = db.cart_items.filter(
      (item) => !(item.id === id && item.user_id === userId)
    );

    if (db.cart_items.length === originalLength) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const budget = getOrCreateBudget(db, userId);
    recalculateSpentBs(db, userId, budget);
    await writeDb(db);

    return res.json({ success: true });
  });

  app.delete(["/app-api/cart", "/api/cart"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);

    db.cart_items = db.cart_items.filter(
      (item) => item.user_id !== userId
    );

    const budget = getOrCreateBudget(db, userId);
    recalculateSpentBs(db, userId, budget);
    await writeDb(db);

    res.json({ success: true });
  });

  app.post(["/app-api/cart/checkout", "/api/cart/checkout"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);
    const budget = getOrCreateBudget(db, userId);
    const activeRate = getActiveRate(db, budget);
    const cartItems = getUserCart(db, userId);

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    const items = cartItems.map((item) => {
      const rate = item.rate_used || activeRate;
      const priceBs = Math.round(item.price_usd * rate * 100) / 100;
      const subtotalUsd =
        Math.round(item.price_usd * item.quantity * 100) / 100;
      const subtotalBs =
        Math.round(priceBs * item.quantity * 100) / 100;

      return {
        name: item.name,
        price_usd: item.price_usd,
        price_bs: priceBs,
        quantity: item.quantity,
        subtotal_usd: subtotalUsd,
        subtotal_bs: subtotalBs,
      };
    });

    const totalUsd =
      Math.round(
        items.reduce((sum, item) => sum + item.subtotal_usd, 0) * 100
      ) / 100;
    const totalBs =
      Math.round(
        items.reduce((sum, item) => sum + item.subtotal_bs, 0) * 100
      ) / 100;
    const remainingBs = Math.max(
      0,
      Math.round((budget.monto_bs - totalBs) * 100) / 100
    );
    const checkoutAt = new Date().toISOString();

    const record: HistoryRecord = {
      id: db.next_history_id++,
      user_id: userId,
      date: checkoutAt,
      total_bs: totalBs,
      total_usd: totalUsd,
      rate_used: activeRate,
      budget_bs: budget.monto_bs,
      remaining_bs: remainingBs,
      items,
      created_at: checkoutAt,
    };

    db.shopping_history.push(record);
    db.cart_items = db.cart_items.filter(
      (item) => item.user_id !== userId
    );
    budget.monto_bs = remainingBs;
    budget.spent_bs = 0;
    budget.updated_at = checkoutAt;
    await writeDb(db);

    return res.json({
      success: true,
      record,
      budget: buildBudgetResponse(db, budget),
    });
  });

  // --- HISTORIAL ---

  app.get(["/app-api/history", "/api/history"], async (req, res) => {
    const db = await readDb();
    const userId = getUserId(req);

    const history = db.shopping_history
      .filter((record) => record.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

    res.json(history);
  });

  // --- PRECIOS COMUNITARIOS ---

  app.get(
    ["/app-api/community-prices", "/api/community-prices"],
    async (req, res) => {
      const db = await readDb();
      const product = String(req.query.product || "").toLowerCase();
      const city = String(req.query.city || "").toLowerCase();
      const state = String(req.query.state || "").toLowerCase();
      const sort = String(req.query.sort || "newest");

      let prices = [...db.community_prices];

      if (product) {
        prices = prices.filter((price) =>
          normalizeProductKey(price.product).includes(product)
        );
      }

      if (city) {
        prices = prices.filter((price) =>
          normalizeProductKey(price.city).includes(city)
        );
      }

      if (state) {
        prices = prices.filter((price) =>
          normalizeProductKey(price.state).includes(state)
        );
      }

      if (sort === "price_asc") {
        prices.sort((a, b) => a.price_usd - b.price_usd);
      } else if (sort === "price_desc") {
        prices.sort((a, b) => b.price_usd - a.price_usd);
      } else {
        prices.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
      }

      res.json(prices);
    }
  );

  app.get(
    [
      "/app-api/community-prices/grouped",
      "/api/community-prices/grouped",
    ],
    async (req, res) => {
      const db = await readDb();
      const product = normalizeProductKey(String(req.query.product || ""));
      const city = normalizeProductKey(String(req.query.city || ""));
      const state = normalizeProductKey(String(req.query.state || ""));
      const sort = String(req.query.sort || "recent");

      let prices = [...db.community_prices];

      if (product) {
        prices = prices.filter((price) =>
          normalizeProductKey(price.product).includes(product)
        );
      }

      if (city) {
        prices = prices.filter((price) =>
          normalizeProductKey(price.city).includes(city)
        );
      }

      if (state) {
        prices = prices.filter((price) =>
          normalizeProductKey(price.state).includes(state)
        );
      }

      const groups = groupCommunityPrices(prices);

      if (sort === "price_asc") {
        groups.sort((a, b) => a.lowest_price_usd - b.lowest_price_usd);
      } else if (sort === "price_desc") {
        groups.sort((a, b) => b.lowest_price_usd - a.lowest_price_usd);
      } else {
        groups.sort(
          (a, b) =>
            new Date(b.latest_report_at).getTime() -
            new Date(a.latest_report_at).getTime()
        );
      }

      res.json(groups);
    }
  );

  app.post(
    ["/app-api/community-prices", "/api/community-prices"],
    async (req, res) => {
      const db = await readDb();
      const {
        product,
        price_usd,
        supermarket,
        city,
        state,
        user_name,
      } = req.body;
      const priceUsd = Number.parseFloat(price_usd) || 0;
      const activeRate = getLatestRate(db);

      const newPrice: CommunityPrice = {
        id: db.next_community_id++,
        product: product?.trim() || "Producto sin nombre",
        price_usd: priceUsd,
        price_bs: Math.round(priceUsd * activeRate * 100) / 100,
        supermarket: supermarket?.trim() || "No especificado",
        city: city?.trim() || "No especificada",
        state: state?.trim() || "No especificado",
        user_name: user_name?.trim() || "Anónimo",
        created_at: new Date().toISOString(),
      };

      db.community_prices.push(newPrice);
      await writeDb(db);

      res.json({ success: true, price: newPrice });
    }
  );

  // --- TASA DE CAMBIO ---

  app.get(
    ["/app-api/exchange-rate-public", "/api/exchange-rate-public"],
    async (req, res) => {
      const db = await readDb();
      const latestRateRecord =
        db.exchange_rates[db.exchange_rates.length - 1] ||
        createEmptyDatabase().exchange_rates[0];

      res.json({
        rate: latestRateRecord.rate_usd,
        date: latestRateRecord.rate_date,
        source: latestRateRecord.source,
        last_updated: latestRateRecord.created_at,
      });
    }
  );

  app.post(
    ["/app-api/exchange-rate/fetch", "/api/exchange-rate/fetch"],
    async (req, res) => {
      const db = await readDb();
      const scraped = await scrapeBcvRate();

      if (scraped) {
        const rateEntry: ExchangeRate = {
          id:
            Math.max(
              0,
              ...db.exchange_rates.map((record) => record.id || 0)
            ) + 1,
          rate_usd: scraped,
          rate_date: new Date().toISOString().split("T")[0],
          source: "DolarApi - Oficial",
          created_at: new Date().toISOString(),
        };

        db.exchange_rates.push(rateEntry);
        await writeDb(db);
      }

      const latestRate =
        db.exchange_rates[db.exchange_rates.length - 1] ||
        createEmptyDatabase().exchange_rates[0];

      res.json({
        success: true,
        scraped: Boolean(scraped),
        rate: latestRate.rate_usd,
        date: latestRate.rate_date,
        source: latestRate.source,
      });
    }
  );

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));

    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}

startServer();
