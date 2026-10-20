import pg from "pg";

const { Pool } = pg;

export function createDatabase({ connectionString, useSsl }) {
  const pool = connectionString
    ? new Pool({
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: true } : undefined,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      })
    : null;

  pool?.on("error", (error) => {
    console.error("Ошибка свободного соединения PostgreSQL:", error.message);
  });

  async function query(text, values = []) {
    if (!pool) {
      const error = new Error("DATABASE_URL is not configured.");
      error.code = "DATABASE_NOT_CONFIGURED";
      throw error;
    }

    return pool.query(text, values);
  }

  return {
    isConfigured: Boolean(pool),
    query,
    async withTransaction(callback) {
      if (!pool) {
        const error = new Error("DATABASE_URL is not configured.");
        error.code = "DATABASE_NOT_CONFIGURED";
        throw error;
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async ping() {
      if (!pool) {
        return false;
      }

      await pool.query("SELECT 1");
      return true;
    },
    async close() {
      if (pool) {
        await pool.end();
      }
    },
  };
}
