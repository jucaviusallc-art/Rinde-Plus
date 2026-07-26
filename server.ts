import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
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

// Initial DB state with realistic default Venezuelan community prices and BCV exchange rate
const defaultDb: DatabaseSchema = {
  budget: {
    id: 1,
    user_id: "user_default",
    monto_bs: 3500.0,
    tipo_tasa: "bcv",
    tasa_custom: 72.5,
    spent_bs: 0.0,
    updated_at: new Date().toISOString(),
  },
  cart_items: [],
  shopping_history: [
    {
      id: 1,
      user_id: "user_default",
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      total_bs: 1450.0,
      total_usd: 20.0,
      rate_used: 72.5,
      budget_bs: 3000.0,
      remaining_bs: 1550.0,
      items: [
        {
          name: "Harina Pan 1kg",
          price_usd: 1.1,
          price_bs: 79.75,
          quantity: 4,
          subtotal_usd: 4.4,
          subtotal_bs: 319.0,
        },
        {
          name: "Quesa Guayanés 500g",
          price_usd: 4.5,
          price_bs: 326.25,
          quantity: 2,
          subtotal_usd: 9.0,
          subtotal_bs: 652.5,
        },
        {
          name: "Café Fama de América 250g",
          price_usd: 3.3,
          price_bs: 239.25,
          quantity: 2,
          subtotal_usd: 6.6,
          subtotal_bs: 478.5,
        },
      ],
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
  community_prices: [
    {
      id: 1,
      product: "Harina de Maíz Precocida 1kg",
      price_usd: 1.05,
      price_bs: 76.12,
      supermarket: "Unicasa",
      city: "Caracas",
      state: "Distrito Capital",
      user_name: "María G.",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 2,
      product: "Harina de Maíz Precocida 1kg",
      price_usd: 1.15,
      price_bs: 83.37,
      supermarket: "Excelsior Gama",
      city: "Caracas",
      state: "Miranda",
      user_name: "Carlos P.",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 3,
      product: "Arroz Primor Blanco 1kg",
      price_usd: 1.2,
      price_bs: 87.0,
      supermarket: "Forum",
      city: "Valencia",
      state: "Carabobo",
      user_name: "Ana V.",
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    {
      id: 4,
      product: "Aceite Vegetal 1L",
      price_usd: 2.8,
      price_bs: 203.0,
      supermarket: "Makro",
      city: "Maracaibo",
      state: "Zulia",
      user_name: "José L.",
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    {
      id: 5,
      product: "Cartón de Huevos 30ud",
      price_usd: 4.8,
      price_bs: 348.0,
      supermarket: "HiperLider",
      city: "Barquisimeto",
      state: "Lara",
      user_name: "Elena R.",
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ],
  exchange_rates: [
    {
      id: 1,
      rate_usd: 72.5,
      rate_date: new Date().toISOString().split("T")[0],
      source: "Banco Central de Venezuela (BCV)",
      created_at: new Date().toISOString(),
    },
  ],
  next_cart_id: 10,
  next_history_id: 2,
  next_community_id: 6,
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

// Scrape BCV exchange rate function
async function scrapeBcvRate(): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      "https://ve.dolarapi.com/v1/dolares/oficial",
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`DolarApi respondió con estado ${res.status}`);
    }
    const data
     = (await res.json()) as {
      promedio?: number;
    };

    const rate = Number(data.promedio);

    if (!Number.isFinite(rate) || rate <= 10 || rate >= 10000) {
      throw new Error("La API devolvió una tasa inválida");
    }

    return Math.round(rate * 100) / 100;
  } catch (e) {
    console.error("Error al consultar DolarApi:", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Helper to calculate total spent in cart
  const recalculateSpentBs = (db: DatabaseSchema): number => {
    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 72.5;

    const totalBs = db.cart_items.reduce((acc, item) => {
      const rate = item.rate_used || activeRate;
      return acc + item.price_usd * item.quantity * rate;
    }, 0);

    const roundedSpent = Math.round(totalBs * 100) / 100;
    db.budget.spent_bs = roundedSpent;
    return roundedSpent;
  };

  // --- API ENDPOINTS (/app-api/*) ---

  // GET /app-api/budget
  app.get(["/app-api/budget", "/api/budget"], (req, res) => {
    const db = readDb();
    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 72.5;

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

  // POST /app-api/budget (Upsert budget)
  app.post(["/app-api/budget", "/api/budget"], (req, res) => {
    const db = readDb();
    const { monto_bs, tipo_tasa, tasa_custom } = req.body;

    if (monto_bs !== undefined) db.budget.monto_bs = parseFloat(monto_bs) || 0;
    if (tipo_tasa === "bcv" || tipo_tasa === "custom") db.budget.tipo_tasa = tipo_tasa;
    if (tasa_custom !== undefined) db.budget.tasa_custom = parseFloat(tasa_custom) || 72.5;

    db.budget.updated_at = new Date().toISOString();
    recalculateSpentBs(db);
    writeDb(db);

    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 72.5;

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

  // GET /app-api/exchange-rate-public
  app.get(["/app-api/exchange-rate-public", "/api/exchange-rate-public"], (req, res) => {
    const db = readDb();
    const latestRateRecord: ExchangeRate = db.exchange_rates[db.exchange_rates.length - 1] || {
      id: 1,
      rate_usd: 72.5,
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

  // POST /app-api/exchange-rate/fetch (Force refresh rate from BCV)
  app.post(["/app-api/exchange-rate/fetch", "/api/exchange-rate/fetch"], async (req, res) => {
    const db = readDb();
    const scraped = await scrapeBcvRate();
    let newRate = scraped;

    if (!newRate) {
      // Fluctuate slightly if testing offline fallback or use stored 742.229
      const last = db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 72.5;
      newRate = last;
    }

    const rateEntry: ExchangeRate = {
      id: db.exchange_rates.length + 1,
      rate_usd: newRate,
      rate_date: new Date().toISOString().split("T")[0],
     source: scraped ? "DolarApi - Oficial" : "DolarApi - Última tasa guardada",
      created_at: new Date().toISOString(),
    };

    db.exchange_rates.push(rateEntry);
     writeDb(db);

    res.json({
      success: true,
      scraped: !!scraped,
      rate: rateEntry.rate_usd,
      date: rateEntry.rate_date,
      source: rateEntry.source,
    });
  });

  // GET /app-api/cart
  app.get(["/app-api/cart", "/api/cart"], (req, res) => {
    const db = readDb();
    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 72.5;

    const items = db.cart_items.map((item) => {
      const rate = item.rate_used || activeRate;
      const subtotal_usd = Math.round(item.price_usd * item.quantity * 100) / 100;
      const subtotal_bs = Math.round(subtotal_usd * rate * 100) / 100;
      const price_bs = Math.round(item.price_usd * rate * 100) / 100;

      return {
        ...item,
        price_bs,
        rate_used: rate,
        subtotal_usd,
        subtotal_bs,
      };
    });

    const total_usd = Math.round(items.reduce((acc, i) => acc + i.subtotal_usd, 0) * 100) / 100;
    const total_bs = Math.round(items.reduce((acc, i) => acc + i.subtotal_bs, 0) * 100) / 100;

    res.json({
      items,
      total_items: items.reduce((acc, i) => acc + i.quantity, 0),
      total_usd,
      total_bs,
      active_rate: activeRate,
      remaining_bs: Math.max(0, Math.round((db.budget.monto_bs - total_bs) * 100) / 100),
    });
  });

  // POST /app-api/cart (Add item to cart or increment if exists)
  app.post(["/app-api/cart", "/api/cart"], (req, res) => {
    const db = readDb();
    const { name, price_usd, quantity } = req.body;

    if (!name || price_usd === undefined) {
      return res.status(400).json({ error: "Nombre y precio en USD son requeridos" });
    }

    const qty = Math.max(1, parseInt(quantity) || 1);
    const parsedPriceUsd = Math.abs(parseFloat(price_usd)) || 0;

    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 72.5;

    // Check if duplicate item (same normalized name + exact same USD price)
    const existingIndex = db.cart_items.findIndex(
      (i) => i.name.trim().toLowerCase() === name.trim().toLowerCase() && Math.abs(i.price_usd - parsedPriceUsd) < 0.01
    );

    let updatedItem: CartItem;

    if (existingIndex !== -1) {
      db.cart_items[existingIndex].quantity += qty;
      db.cart_items[existingIndex].rate_used = activeRate;
      updatedItem = db.cart_items[existingIndex];
    } else {
      updatedItem = {
        id: db.next_cart_id++,
        user_id: "user_default",
        name: name.trim(),
        price_usd: parsedPriceUsd,
        quantity: qty,
        rate_used: activeRate,
        created_at: new Date().toISOString(),
      };
      db.cart_items.push(updatedItem);
    }

    recalculateSpentBs(db);
    writeDb(db);

    res.json({
      success: true,
      item: updatedItem,
      spent_bs: db.budget.spent_bs,
    });
  });

  // PUT /app-api/cart/:id (Update quantity)
  app.put(["/app-api/cart/:id", "/api/cart/:id"], (req, res) => {
    const db = readDb();
    const itemId = parseInt(req.params.id);
    const { quantity } = req.body;

    const itemIndex = db.cart_items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Producto no encontrado en carrito" });
    }

    const newQty = parseInt(quantity);
    if (isNaN(newQty) || newQty <= 0) {
      db.cart_items.splice(itemIndex, 1);
    } else {
      db.cart_items[itemIndex].quantity = newQty;
    }

    recalculateSpentBs(db);
    writeDb(db);

    res.json({
      success: true,
      spent_bs: db.budget.spent_bs,
    });
  });

  // DELETE /app-api/cart/:id (Delete item)
  app.delete(["/app-api/cart/:id", "/api/cart/:id"], (req, res) => {
    const db = readDb();
    const itemId = parseInt(req.params.id);

    db.cart_items = db.cart_items.filter((i) => i.id !== itemId);
    recalculateSpentBs(db);
    writeDb(db);

    res.json({
      success: true,
      spent_bs: db.budget.spent_bs,
    });
  });

  // POST /app-api/cart/checkout (Finalize purchase)
  app.post(["/app-api/cart/checkout", "/api/cart/checkout"], (req, res) => {
    const db = readDb();

    if (db.cart_items.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 72.5;

    const snapshotItems = db.cart_items.map((i) => {
      const rate = i.rate_used || activeRate;
      const subtotal_usd = Math.round(i.price_usd * i.quantity * 100) / 100;
      const subtotal_bs = Math.round(subtotal_usd * rate * 100) / 100;
      const price_bs = Math.round(i.price_usd * rate * 100) / 100;
      return {
        name: i.name,
        price_usd: i.price_usd,
        price_bs,
        quantity: i.quantity,
        subtotal_usd,
        subtotal_bs,
      };
    });

    const total_usd = Math.round(snapshotItems.reduce((acc, i) => acc + i.subtotal_usd, 0) * 100) / 100;
    const total_bs = Math.round(snapshotItems.reduce((acc, i) => acc + i.subtotal_bs, 0) * 100) / 100;
    const budget_bs = db.budget.monto_bs;
    const remaining_bs = Math.max(0, Math.round((budget_bs - total_bs) * 100) / 100);

    const historyRecord: HistoryRecord = {
      id: db.next_history_id++,
      user_id: "user_default",
      date: new Date().toISOString(),
      total_bs,
      total_usd,
      rate_used: activeRate,
      budget_bs,
      remaining_bs,
      items: snapshotItems,
      created_at: new Date().toISOString(),
    };

    db.shopping_history.unshift(historyRecord); // Add to top
    db.cart_items = []; // Empty cart
    db.budget.spent_bs = 0; // Reset spent_bs
    writeDb(db);

    res.json({
      success: true,
      message: "Compra finalizada con éxito",
      record: historyRecord,
    });
  });

  // GET /app-api/history
  app.get(["/app-api/history", "/api/history"], (req, res) => {
    const db = readDb();
    res.json(db.shopping_history);
  });

  // GET /app-api/community-prices
  app.get(["/app-api/community-prices", "/api/community-prices"], (req, res) => {
    const db = readDb();
    const { product, city, state, sort } = req.query;

    let items = [...db.community_prices];

    if (product && typeof product === "string" && product.trim() !== "") {
      const q = product.toLowerCase().trim();
      items = items.filter((i) => i.product.toLowerCase().includes(q));
    }

    if (city && typeof city === "string" && city.trim() !== "") {
      items = items.filter((i) => i.city.toLowerCase() === city.toLowerCase().trim());
    }

    if (state && typeof state === "string" && state.trim() !== "") {
      items = items.filter((i) => i.state.toLowerCase() === state.toLowerCase().trim());
    }

    // Sort logic
    if (sort === "price_asc") {
      items.sort((a, b) => a.price_usd - b.price_usd);
    } else if (sort === "price_desc") {
      items.sort((a, b) => b.price_usd - a.price_usd);
    } else {
      // Default: recent first
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Calculate lowest price per product to highlight "Más bajo" badge
    const lowestMap: Record<string, number> = {};
    db.community_prices.forEach((i) => {
      const norm = i.product.trim().toLowerCase();
      if (lowestMap[norm] === undefined || i.price_usd < lowestMap[norm]) {
        lowestMap[norm] = i.price_usd;
      }
    });

    const itemsWithLowest = items.map((i) => {
      const norm = i.product.trim().toLowerCase();
      const is_lowest = Math.abs(i.price_usd - lowestMap[norm]) < 0.001;
      return {
        ...i,
        is_lowest,
      };
    });

    res.json(itemsWithLowest);
  });

  // POST /app-api/community-prices
  app.post(["/app-api/community-prices", "/api/community-prices"], (req, res) => {
    const db = readDb();
    const { product, price_usd, supermarket, city, state, user_name } = req.body;

    if (!product || price_usd === undefined || !supermarket || !city || !state) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const activeRate =
      db.budget.tipo_tasa === "custom"
        ? db.budget.tasa_custom
        : db.exchange_rates[db.exchange_rates.length - 1]?.rate_usd || 72.5;

    const parsedPriceUsd = parseFloat(price_usd);
    const newPriceItem: CommunityPrice = {
      id: db.next_community_id++,
      product: product.trim(),
      price_usd: parsedPriceUsd,
      price_bs: Math.round(parsedPriceUsd * activeRate * 100) / 100,
      supermarket: supermarket.trim(),
      city: city.trim(),
      state: state.trim(),
      user_name: user_name ? user_name.trim() : "Comprador Rinde+",
      created_at: new Date().toISOString(),
    };

    db.community_prices.unshift(newPriceItem);
    writeDb(db);

    res.json({
      success: true,
      price: newPriceItem,
    });
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
