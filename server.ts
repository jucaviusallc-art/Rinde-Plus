import cors from "cors";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(process.cwd(), "db_rinde.json");

// Define schema types
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

interface ExchangeRate {
  id: number;
  rate_usd: number;
  rate_date: string;
  source: string;
  created_at: string;
}

interface DatabaseSchema {
  budget: Budget;
  cart_items: CartItem[];
  shopping_history: HistoryRecord[];
  community_prices: CommunityPrice[];
  exchange_rates: ExchangeRate[];
  next_cart_id: number;
  next_history_id: number;
  next_community_id: number;
}

const defaultDb: DatabaseSchema = {
  budget: {
    id: 1,
    user_id: "user_default",
    monto_bs: 0.0,
    tipo_tasa: "bcv",
    tasa_custom: 742.23,
    spent_bs: 0.0,
    updated_at: new Date().toISOString(),
  },
  cart_items: [],
  shopping_history: [],
  community_prices: [],
  exchange_rates: [
    {
      id: 1,
      rate_usd: 742.23,
      rate_date: new Date().toISOString().split("T")[0],
      source: "Banco Central de Venezuela (BCV)",
      created_at: new Date().toISOString(),
    },
  ],
  next_cart_id: 1,
  next_history_id: 1,
  next_community_id: 1,
};

function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file, using fallback:", err);
  }
  return defaultDb;
}

function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
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
  } catch (e) {
    console.error("Error al consultar la tasa oficial:", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const recalculateSpentBs = (db: DatabaseSchema): number => {
    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 742.23;

    const totalBs = db.cart_items.reduce((acc, item) => {
      const rate = item.rate_used || activeRate;
      return acc + item.price_usd * item.quantity * rate;
    }, 0);

    const roundedSpent = Math.round(totalBs * 100) / 100;
    db.budget.spent_bs = roundedSpent;
    return roundedSpent;
  };

  // --- ENDPOINTS BUDGET ---
  app.get(["/app-api/budget", "/api/budget"], (req, res) => {
    const db = readDb();
    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 742.23;

    recalculateSpentBs(db);
    writeDb(db);

    res.json({
      ...db.budget,
      active_rate: activeRate,
      remaining_bs: Math.max(0, Math.round((db.budget.monto_bs - db.budget.spent_bs) * 100) / 100),
      budget_usd: Math.round((db.budget.monto_bs / activeRate) * 100) / 100,
      spent_usd: Math.round((db.budget.spent_bs / activeRate) * 100) / 100,
      remaining_usd: Math.max(0, Math.round(((db.budget.monto_bs - db.budget.spent_bs) / activeRate) * 100) / 100),
      percentage_remaining:
        db.budget.monto_bs > 0
          ? Math.max(0, Math.round(((db.budget.monto_bs - db.budget.spent_bs) / db.budget.monto_bs) * 100))
          : 0,
    });
  });

  app.post(["/app-api/budget", "/api/budget"], (req, res) => {
    const db = readDb();
    const { monto_bs, tipo_tasa, tasa_custom } = req.body;

    if (monto_bs !== undefined) db.budget.monto_bs = parseFloat(monto_bs) || 0;
    if (tipo_tasa === "bcv" || tipo_tasa === "custom") db.budget.tipo_tasa = tipo_tasa;
    if (tasa_custom !== undefined) db.budget.tasa_custom = parseFloat(tasa_custom) || 742.23;

    db.budget.updated_at = new Date().toISOString();
    recalculateSpentBs(db);
    writeDb(db);

    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 742.23;

    res.json({
      success: true,
      budget: {
        ...db.budget,
        active_rate: activeRate,
        remaining_bs: Math.max(0, Math.round((db.budget.monto_bs - db.budget.spent_bs) * 100) / 100),
        budget_usd: Math.round((db.budget.monto_bs / activeRate) * 100) / 100,
        spent_usd: Math.round((db.budget.spent_bs / activeRate) * 100) / 100,
      },
    });
  });

  // --- ENDPOINTS CART (CARRITO) ---
  app.get(["/app-api/cart", "/api/cart"], (req, res) => {
    const db = readDb();
    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 742.23;

    const items = db.cart_items.map((item) => {
      const rate = item.rate_used || activeRate;
      const price_bs = Math.round(item.price_usd * rate * 100) / 100;
      const subtotal_usd = Math.round(item.price_usd * item.quantity * 100) / 100;
      const subtotal_bs = Math.round(price_bs * item.quantity * 100) / 100;

      return {
        ...item,
        price_bs,
        subtotal_usd,
        subtotal_bs,
      };
    });

    res.json(items);
  });

  app.post(["/app-api/cart", "/api/cart"], (req, res) => {
    const db = readDb();
    const { name, price_usd, quantity } = req.body;

    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 742.23;

    const newItem: CartItem = {
      id: db.next_cart_id++,
      user_id: "user_default",
      name: name || "Producto sin nombre",
      price_usd: parseFloat(price_usd) || 0,
      quantity: parseInt(quantity) || 1,
      rate_used: activeRate,
      created_at: new Date().toISOString(),
    };

    db.cart_items.push(newItem);
    recalculateSpentBs(db);
    writeDb(db);

    res.json({ success: true, item: newItem });
  });

  app.delete(["/app-api/cart/:id", "/api/cart/:id"], (req, res) => {
    const db = readDb();
    const id = parseInt(req.params.id);
    db.cart_items = db.cart_items.filter((item) => item.id !== id);
    recalculateSpentBs(db);
    writeDb(db);
    res.json({ success: true });
  });

  app.delete(["/app-api/cart", "/api/cart"], (req, res) => {
    const db = readDb();
    db.cart_items = [];
    recalculateSpentBs(db);
    writeDb(db);
    res.json({ success: true });
  });

  // --- ENDPOINTS EXCHANGE RATE ---
  app.get(["/app-api/exchange-rate-public", "/api/exchange-rate-public"], (req, res) => {
    const db = readDb();
    const latestRateRecord: ExchangeRate = db.exchange_rates[db.exchange_rates.length - 1] || {
      id: 1,
      rate_usd: 742.23,
      rate_date: new Date().toISOString().split("T")[0],
      source: "Banco Central de Venezuela (BCV)",
      created_at: new Date().toISOString(),
    };

    res.json({
      rate: latestRateRecord.rate_usd,
      date: latestRateRecord.rate_date,
      source: latestRateRecord.source,
      last_updated: latestRateRecord.created_at,
    });
  });

  app.post(["/app-api/exchange-rate/fetch", "/api/exchange-rate/fetch"], async (req, res) => {
    const db = readDb();
    const scraped = await scrapeBcvRate();

    if (scraped) {
      const rateEntry: ExchangeRate = {
        id: db.exchange_rates.length + 1,
        rate_usd: scraped,
        rate_date: new Date().toISOString().split("T")[0],
        source: "DolarApi - Oficial",
        created_at: new Date().toISOString(),
      };
      db.exchange_rates.push(rateEntry);
      writeDb(db);
    }

    const latestRate = db.exchange_rates[db.exchange_rates.length - 1] || {
      rate_usd: 742.23,
      rate_date: new Date().toISOString().split("T")[0],
      source: "Banco Central de Venezuela (BCV)",
    };

    res.json({
      success: true,
      scraped: !!scraped,
      rate: latestRate.rate_usd,
      date: latestRate.rate_date,
      source: latestRate.source,
    });
  });

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