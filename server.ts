import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

// ==========================================================
// CONEXIÓN A SUPABASE / POSTGRESQL
// ==========================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ==========================================================
// EXPRESS
// ==========================================================

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==========================================================
// USUARIO
// ==========================================================

function getUserId(req: express.Request): string {
  const userId = req.headers["x-user-id"];

  if (typeof userId === "string" && userId.trim()) {
    return userId.trim();
  }

  return "default_user";
}

// ==========================================================
// UTILIDADES
// ==========================================================

function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// ==========================================================
// TASAS DE CAMBIO
// ==========================================================
//
// Estas tasas son solamente un respaldo en memoria.
// La aplicación actualmente obtiene las tasas principalmente
// mediante DolarApi.
//
// ==========================================================

let currentRates = {
  USD: {
    rate: 784.66,
    date: new Date().toISOString().split("T")[0],
    source: "Rinde+ - respaldo",
  },
  EUR: {
    rate: 916.0,
    date: new Date().toISOString().split("T")[0],
    source: "Rinde+ - respaldo",
  },
};

// ----------------------------------------------------------
// GET TASA
// ----------------------------------------------------------

app.get(
  [
    "/api/exchange-rate-public",
    "/app-api/exchange-rate-public",
  ],
  async (req, res) => {
    try {
      const currency =
        String(req.query.currency || "USD").toUpperCase();

      if (currency !== "USD" && currency !== "EUR") {
        return res.status(400).json({
          error: "Moneda no válida",
        });
      }

      const rate = currentRates[
        currency as "USD" | "EUR"
      ];

      return res.json({
        rate: rate.rate,
        date: rate.date,
        source: rate.source,
      });
    } catch (err) {
      console.error(
        "Error al obtener tasa:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// POST ACTUALIZAR TASA
// ----------------------------------------------------------

app.post(
  [
    "/api/exchange-rate/fetch",
    "/app-api/exchange-rate/fetch",
  ],
  async (req, res) => {
    try {
      const { bcv, eur } = req.body || {};

      if (
        bcv !== undefined &&
        Number.isFinite(Number(bcv)) &&
        Number(bcv) > 0
      ) {
        currentRates.USD = {
          rate: Number(bcv),
          date: new Date()
            .toISOString()
            .split("T")[0],
          source: "Backend Rinde+",
        };
      }

      if (
        eur !== undefined &&
        Number.isFinite(Number(eur)) &&
        Number(eur) > 0
      ) {
        currentRates.EUR = {
          rate: Number(eur),
          date: new Date()
            .toISOString()
            .split("T")[0],
          source: "Backend Rinde+",
        };
      }

      return res.json({
        success: true,
        rates: currentRates,
      });
    } catch (err) {
      console.error(
        "Error al actualizar tasas:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ==========================================================
// PRESUPUESTO
// ==========================================================

// ----------------------------------------------------------
// OBTENER PRESUPUESTO
// ----------------------------------------------------------

app.get(
  [
    "/api/budget",
    "/app-api/budget",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const result = await pool.query(
        `
        SELECT *
        FROM budgets
        WHERE user_id = $1
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.json({
          monto_bs: 0,
          tipo_tasa: "bcv",
          tasa_custom: 0,
          spent_bs: 0,
        });
      }

      return res.json(result.rows[0]);
    } catch (err) {
      console.error(
        "Error al obtener presupuesto:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// GUARDAR PRESUPUESTO
// ----------------------------------------------------------

app.post(
  [
    "/api/budget",
    "/app-api/budget",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const {
        monto_bs,
        tipo_tasa,
        tasa_custom,
      } = req.body;

      const result = await pool.query(
        `
        INSERT INTO budgets (
          user_id,
          monto_bs,
          tipo_tasa,
          tasa_custom,
          spent_bs,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          0,
          NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          monto_bs = EXCLUDED.monto_bs,
          tipo_tasa = EXCLUDED.tipo_tasa,
          tasa_custom = EXCLUDED.tasa_custom,
          updated_at = NOW()
        RETURNING *
        `,
        [
          userId,
          Number(monto_bs) || 0,
          tipo_tasa || "bcv",
          Number(tasa_custom) || 0,
        ]
      );

      return res.json(result.rows[0]);
    } catch (err) {
      console.error(
        "Error al guardar presupuesto:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ==========================================================
// CARRITO
// ==========================================================

// ----------------------------------------------------------
// OBTENER CARRITO
// ----------------------------------------------------------

app.get(
  [
    "/api/cart",
    "/app-api/cart",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const result = await pool.query(
        `
        SELECT *
        FROM cart_items
        WHERE user_id = $1
        ORDER BY id DESC
        `,
        [userId]
      );

      const items = result.rows;

      const total_items =
        items.reduce(
          (sum, item) =>
            sum + Number(item.quantity || 0),
          0
        );

      const total_usd =
        items.reduce(
          (sum, item) =>
            sum +
            Number(item.price_usd || 0) *
              Number(item.quantity || 0),
          0
        );

      const total_bs =
        items.reduce(
          (sum, item) => {
            const rate =
              Number(item.rate_used) || 1;

            return (
              sum +
              Number(item.price_usd || 0) *
                Number(item.quantity || 0) *
                rate
            );
          },
          0
        );

      // Obtener presupuesto
      const budgetResult =
        await pool.query(
          `
          SELECT *
          FROM budgets
          WHERE user_id = $1
          LIMIT 1
          `,
          [userId]
        );

      const budget =
        budgetResult.rows[0];

      const remaining_bs = budget
        ? Number(budget.monto_bs || 0) -
          Number(budget.spent_bs || 0) -
          total_bs
        : 0;

      return res.json({
        items,
        total_items,
        total_usd: roundMoney(total_usd),
        total_bs: roundMoney(total_bs),
        active_rate:
          items.length > 0
            ? Number(items[0].rate_used) || 1
            : 0,
        remaining_bs:
          roundMoney(remaining_bs),
      });
    } catch (err) {
      console.error(
        "Error al obtener carrito:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// AGREGAR PRODUCTO
// ----------------------------------------------------------

app.post(
  [
    "/api/cart",
    "/app-api/cart",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const {
        name,
        price_usd,
        quantity,
        currency,
        rate_used,
      } = req.body;

      const result = await pool.query(
        `
        INSERT INTO cart_items (
          user_id,
          name,
          price_usd,
          currency,
          quantity,
          rate_used
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )
        RETURNING *
        `,
        [
          userId,
          name,
          Number(price_usd) || 0,
          currency || "USD",
          Number(quantity) || 1,
          Number(rate_used) || 1,
        ]
      );

      return res.json(
        result.rows[0]
      );
    } catch (err) {
      console.error(
        "Error al agregar producto:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// ACTUALIZAR CANTIDAD
// ----------------------------------------------------------

app.put(
  [
    "/api/cart/:id",
    "/app-api/cart/:id",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const id = Number(req.params.id);

      const quantity =
        Number(req.body.quantity);

      if (
        !Number.isFinite(id) ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          error: "Cantidad o ID inválido",
        });
      }

      const result = await pool.query(
        `
        UPDATE cart_items
        SET quantity = $1
        WHERE id = $2
          AND user_id = $3
        RETURNING *
        `,
        [
          quantity,
          id,
          userId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Producto no encontrado",
        });
      }

      return res.json(
        result.rows[0]
      );
    } catch (err) {
      console.error(
        "Error al actualizar cantidad:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// ELIMINAR PRODUCTO
// ----------------------------------------------------------

app.delete(
  [
    "/api/cart/:id",
    "/app-api/cart/:id",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const id = Number(req.params.id);

      const result = await pool.query(
        `
        DELETE FROM cart_items
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Producto no encontrado",
        });
      }

      return res.json({
        success: true,
      });
    } catch (err) {
      console.error(
        "Error al eliminar producto:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ==========================================================
// CHECKOUT
// ==========================================================
//
// IMPORTANTE:
// apiService.ts actual llama a checkout()
// sin enviar record ni budget.
//
// Por eso el servidor construye el registro
// usando carrito + presupuesto de PostgreSQL.
// ==========================================================

app.post(
  [
    "/api/cart/checkout",
    "/app-api/cart/checkout",
  ],
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const userId = getUserId(req);

      await client.query(
        "BEGIN"
      );

      // -----------------------------------------------
      // 1. Obtener carrito
      // -----------------------------------------------

      const cartResult =
        await client.query(
          `
          SELECT *
          FROM cart_items
          WHERE user_id = $1
          ORDER BY id ASC
          `,
          [userId]
        );

      if (
        cartResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          error:
            "El carrito está vacío",
        });
      }

      const items =
        cartResult.rows;

      // -----------------------------------------------
      // 2. Calcular totales
      // -----------------------------------------------

      const total_usd =
        items.reduce(
          (sum, item) =>
            sum +
            Number(item.price_usd || 0) *
              Number(item.quantity || 0),
          0
        );

      const total_bs =
        items.reduce(
          (sum, item) =>
            sum +
            Number(item.price_usd || 0) *
              Number(item.quantity || 0) *
              (Number(item.rate_used) || 1),
          0
        );

      const rate_used =
        items.length > 0
          ? Number(items[0].rate_used) || 1
          : 1;

      // -----------------------------------------------
      // 3. Obtener presupuesto
      // -----------------------------------------------

      const budgetResult =
        await client.query(
          `
          SELECT *
          FROM budgets
          WHERE user_id = $1
          LIMIT 1
          `,
          [userId]
        );

      const budget =
        budgetResult.rows[0];

      const budget_bs =
        budget
          ? Number(budget.monto_bs || 0)
          : 0;

      const previousSpent =
        budget
          ? Number(budget.spent_bs || 0)
          : 0;

      const newSpent =
        previousSpent + total_bs;

      const remaining_bs =
        budget_bs - newSpent;

      // -----------------------------------------------
      // 4. Preparar items para historial
      // -----------------------------------------------

      const historyItems =
        items.map((item) => ({
          id: item.id,
          name: item.name,
          price_usd:
            Number(item.price_usd) || 0,
          quantity:
            Number(item.quantity) || 1,
          currency:
            item.currency || "USD",
          rate_used:
            Number(item.rate_used) || 1,
        }));

      // -----------------------------------------------
      // 5. Guardar historial
      // -----------------------------------------------

      const historyResult =
        await client.query(
          `
          INSERT INTO shopping_history (
            user_id,
            date,
            total_bs,
            total_usd,
            rate_used,
            budget_bs,
            remaining_bs,
            items
          )
          VALUES (
            $1,
            NOW(),
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          RETURNING *
          `,
          [
            userId,
            roundMoney(total_bs),
            roundMoney(total_usd),
            rate_used,
            roundMoney(budget_bs),
            roundMoney(remaining_bs),
            JSON.stringify(
              historyItems
            ),
          ]
        );

      // -----------------------------------------------
      // 6. Actualizar presupuesto
      // -----------------------------------------------

      if (budget) {
        await client.query(
          `
          UPDATE budgets
          SET spent_bs = $1,
              updated_at = NOW()
          WHERE user_id = $2
          `,
          [
            roundMoney(newSpent),
            userId,
          ]
        );
      }

      // -----------------------------------------------
      // 7. Vaciar carrito
      // -----------------------------------------------

      await client.query(
        `
        DELETE FROM cart_items
        WHERE user_id = $1
        `,
        [userId]
      );

      await client.query(
        "COMMIT"
      );

      return res.json({
        success: true,
        record:
          historyResult.rows[0],
      });
    } catch (err) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Error en checkout:",
        err
      );

      return res.status(500).json({
        error:
          "Error al procesar la compra",
      });
    } finally {
      client.release();
    }
  }
);

// ==========================================================
// HISTORIAL
// ==========================================================

// ----------------------------------------------------------
// OBTENER HISTORIAL
// ----------------------------------------------------------

app.get(
  [
    "/api/history",
    "/app-api/history",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const result = await pool.query(
        `
        SELECT *
        FROM shopping_history
        WHERE user_id = $1
        ORDER BY date DESC
        `,
        [userId]
      );

      return res.json(
        result.rows
      );
    } catch (err) {
      console.error(
        "Error al obtener historial:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// ELIMINAR REGISTRO
// ----------------------------------------------------------

app.delete(
  [
    "/api/history/:id",
    "/app-api/history/:id",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const id =
        Number(req.params.id);

      const result =
        await pool.query(
          `
          DELETE FROM shopping_history
          WHERE id = $1
            AND user_id = $2
          RETURNING id
          `,
          [
            id,
            userId,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          error:
            "Compra no encontrada",
        });
      }

      return res.json({
        success: true,
      });
    } catch (err) {
      console.error(
        "Error al eliminar historial:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// VACIAR HISTORIAL
// ----------------------------------------------------------

app.delete(
  [
    "/api/history",
    "/app-api/history",
  ],
  async (req, res) => {
    try {
      const userId = getUserId(req);

      await pool.query(
        `
        DELETE FROM shopping_history
        WHERE user_id = $1
        `,
        [userId]
      );

      return res.json({
        success: true,
      });
    } catch (err) {
      console.error(
        "Error al vaciar historial:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ==========================================================
// COMUNIDAD
// ==========================================================

// ----------------------------------------------------------
// OBTENER PRECIOS
// ----------------------------------------------------------

app.get(
  [
    "/api/community-prices",
    "/app-api/community-prices",
  ],
  async (req, res) => {
    try {
      const {
        product,
        city,
        state,
        sort,
      } = req.query;

      const values: any[] = [];

      const conditions: string[] = [];

      if (
        typeof product === "string" &&
        product.trim()
      ) {
        values.push(
          `%${product.trim()}%`
        );

        conditions.push(
          `LOWER(product) LIKE LOWER($${values.length})`
        );
      }

      if (
        typeof city === "string" &&
        city.trim()
      ) {
        values.push(
          `%${city.trim()}%`
        );

        conditions.push(
          `LOWER(city) LIKE LOWER($${values.length})`
        );
      }

      if (
        typeof state === "string" &&
        state.trim()
      ) {
        values.push(
          `%${state.trim()}%`
        );

        conditions.push(
          `LOWER(state) LIKE LOWER($${values.length})`
        );
      }

      let query = `
        SELECT *
        FROM community_prices
      `;

      if (
        conditions.length > 0
      ) {
        query +=
          " WHERE " +
          conditions.join(
            " AND "
          );
      }

      if (
        sort === "price_asc"
      ) {
        query +=
          " ORDER BY price_usd ASC";
      } else if (
        sort === "price_desc"
      ) {
        query +=
          " ORDER BY price_usd DESC";
      } else {
        query +=
          " ORDER BY created_at DESC";
      }

      const result =
        await pool.query(
          query,
          values
        );

      return res.json(
        result.rows
      );
    } catch (err) {
      console.error(
        "Error al obtener precios comunitarios:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// PRECIOS AGRUPADOS
// ----------------------------------------------------------

app.get(
  [
    "/api/community-prices/grouped",
    "/app-api/community-prices/grouped",
  ],
  async (req, res) => {
    try {
      const {
        product,
        city,
        state,
        sort,
      } = req.query;

      const values: any[] = [];

      const conditions: string[] = [];

      if (
        typeof product === "string" &&
        product.trim()
      ) {
        values.push(
          `%${product.trim()}%`
        );

        conditions.push(
          `LOWER(product) LIKE LOWER($${values.length})`
        );
      }

      if (
        typeof city === "string" &&
        city.trim()
      ) {
        values.push(
          `%${city.trim()}%`
        );

        conditions.push(
          `LOWER(city) LIKE LOWER($${values.length})`
        );
      }

      if (
        typeof state === "string" &&
        state.trim()
      ) {
        values.push(
          `%${state.trim()}%`
        );

        conditions.push(
          `LOWER(state) LIKE LOWER($${values.length})`
        );
      }

      let query = `
        SELECT *
        FROM community_prices
      `;

      if (
        conditions.length > 0
      ) {
        query +=
          " WHERE " +
          conditions.join(
            " AND "
          );
      }

      query +=
        " ORDER BY created_at DESC";

      const result =
        await pool.query(
          query,
          values
        );

      // -----------------------------------------------
      // Agrupar por producto
      // -----------------------------------------------

      const groups =
        new Map<string, any>();

      for (
        const row of result.rows
      ) {
        const key =
          String(row.product)
            .trim()
            .toLowerCase();

        if (!groups.has(key)) {
          groups.set(
            key,
            {
              product:
                row.product,

              lowest_price_usd:
                Number(
                  row.price_usd
                ),

              highest_price_usd:
                Number(
                  row.price_usd
                ),

              average_price_usd:
                Number(
                  row.price_usd
                ),

              lowest_price_bs:
                Number(
                  row.price_bs
                ),

              highest_price_bs:
                Number(
                  row.price_bs
                ),

              average_price_bs:
                Number(
                  row.price_bs
                ),

              reports: 1,

              supermarkets: 1,

              latest_report_at:
                row.created_at,

              offers: [
                {
                  ...row,
                  is_lowest: true,
                },
              ],
            }
          );

          continue;
        }

        const group =
          groups.get(key);

        const priceUsd =
          Number(row.price_usd);

        const priceBs =
          Number(row.price_bs);

        group.lowest_price_usd =
          Math.min(
            group.lowest_price_usd,
            priceUsd
          );

        group.highest_price_usd =
          Math.max(
            group.highest_price_usd,
            priceUsd
          );

        group.lowest_price_bs =
          Math.min(
            group.lowest_price_bs,
            priceBs
          );

        group.highest_price_bs =
          Math.max(
            group.highest_price_bs,
            priceBs
          );

        group.reports += 1;

        if (
          !group.supermarketNames
        ) {
          group.supermarketNames =
            new Set<string>();
        }

        group.supermarketNames.add(
          String(row.supermarket)
        );

        group.supermarkets =
          group.supermarketNames.size;

        group.offers.push({
          ...row,
          is_lowest:
            priceUsd ===
            group.lowest_price_usd,
        });

        const latest =
          new Date(
            group.latest_report_at
          ).getTime();

        const current =
          new Date(
            row.created_at
          ).getTime();

        if (
          current > latest
        ) {
          group.latest_report_at =
            row.created_at;
        }
      }

      const finalGroups =
        Array.from(
          groups.values()
        ).map((group) => {
          const prices =
            group.offers.map(
              (offer: any) =>
                Number(
                  offer.price_usd
                )
            );

          const pricesBs =
            group.offers.map(
              (offer: any) =>
                Number(
                  offer.price_bs
                )
            );

          group.average_price_usd =
            prices.reduce(
              (a: number, b: number) =>
                a + b,
              0
            ) / prices.length;

          group.average_price_bs =
            pricesBs.reduce(
              (a: number, b: number) =>
                a + b,
              0
            ) / pricesBs.length;

          group.lowest_price_usd =
            roundMoney(
              group.lowest_price_usd
            );

          group.highest_price_usd =
            roundMoney(
              group.highest_price_usd
            );

          group.average_price_usd =
            roundMoney(
              group.average_price_usd
            );

          group.lowest_price_bs =
            roundMoney(
              group.lowest_price_bs
            );

          group.highest_price_bs =
            roundMoney(
              group.highest_price_bs
            );

          group.average_price_bs =
            roundMoney(
              group.average_price_bs
            );

          delete group.supermarketNames;

          return group;
        });

      if (
        sort === "price_asc"
      ) {
        finalGroups.sort(
          (a, b) =>
            a.lowest_price_usd -
            b.lowest_price_usd
        );
      } else if (
        sort === "price_desc"
      ) {
        finalGroups.sort(
          (a, b) =>
            b.lowest_price_usd -
            a.lowest_price_usd
        );
      } else {
        finalGroups.sort(
          (a, b) =>
            new Date(
              b.latest_report_at
            ).getTime() -
            new Date(
              a.latest_report_at
            ).getTime()
        );
      }

      return res.json(
        finalGroups
      );
    } catch (err) {
      console.error(
        "Error al obtener precios agrupados:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// PUBLICAR PRECIO EN COMUNIDAD
// ----------------------------------------------------------

app.post(
  [
    "/api/community-prices",
    "/app-api/community-prices",
  ],
  async (req, res) => {
    try {
      const {
        product,
        price_usd,
        price_bs,
        supermarket,
        city,
        state,
        user_name,
        user_email,
      } = req.body;

      const priceUsd =
        Number(price_usd) || 0;

      const priceBs =
        Number(price_bs) || 0;

      if (
        !product ||
        priceUsd <= 0
      ) {
        return res.status(400).json({
          error:
            "Producto y precio son obligatorios",
        });
      }

      const result =
        await pool.query(
          `
          INSERT INTO community_prices (
            product,
            price_usd,
            price_bs,
            supermarket,
            city,
            state,
            user_name,
            user_email,
            created_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            NOW()
          )
          RETURNING *
          `,
          [
            product.trim(),
            priceUsd,
            priceBs,
            supermarket?.trim() ||
              "No especificado",
            city?.trim() ||
              "No especificada",
            state?.trim() ||
              "No especificado",
            user_name?.trim() ||
              "Anónimo",
            user_email?.trim() ||
              null,
          ]
        );

      return res.json(
        result.rows[0]
      );
    } catch (err) {
      console.error(
        "Error al registrar precio comunitario:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ----------------------------------------------------------
// ELIMINAR PRECIO COMUNITARIO
// ----------------------------------------------------------

app.delete(
  [
    "/api/community-prices/:id",
    "/app-api/community-prices/:id",
  ],
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const result =
        await pool.query(
          `
          DELETE FROM community_prices
          WHERE id = $1
          RETURNING id
          `,
          [id]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          error:
            "Precio no encontrado",
        });
      }

      return res.json({
        success: true,
      });
    } catch (err) {
      console.error(
        "Error al eliminar precio comunitario:",
        err
      );

      return res.status(500).json({
        error: "Error interno del servidor",
      });
    }
  }
);

// ==========================================================
// PRUEBA DE CONEXIÓN
// ==========================================================

app.get(
  [
    "/api/health",
    "/app-api/health",
  ],
  async (req, res) => {
    try {
      const result =
        await pool.query(
          "SELECT NOW() AS now"
        );

      return res.json({
        success: true,
        database: "connected",
        timestamp:
          result.rows[0].now,
      });
    } catch (err) {
      console.error(
        "Error en health check:",
        err
      );

      return res.status(500).json({
        success: false,
        database: "disconnected",
      });
    }
  }
);

// ==========================================================
// INICIO
// ==========================================================

app.listen(PORT, () => {
  console.log(
    `🚀 Rinde+ server corriendo en puerto ${PORT}`
  );

  pool.query(
    "SELECT NOW() AS now",
    (err, result) => {
      if (err) {
        console.error(
          "❌ Error de conexión a PostgreSQL:",
          err
        );
      } else {
        console.log(
          "✅ Conectado exitosamente a Supabase PostgreSQL:",
          result.rows[0].now
        );
      }
    }
  );
});