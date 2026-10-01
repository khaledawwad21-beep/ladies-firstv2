"use strict";

const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  console.warn(
    "[DB] WARNING: DATABASE_URL is not configured."
  );
}

const pool = new Pool({
  connectionString: DATABASE_URL || undefined,

  ssl: DATABASE_URL
    ? {
        rejectUnauthorized: false
      }
    : false,

  max: Number(process.env.DB_POOL_MAX || 10),

  idleTimeoutMillis: Number(
    process.env.DB_IDLE_TIMEOUT || 30000
  ),

  connectionTimeoutMillis: Number(
    process.env.DB_CONNECTION_TIMEOUT || 10000
  )
});

/**
 * Execute a database query.
 *
 * @param {string} text
 * @param {Array} params
 * @returns {Promise<import("pg").QueryResult>}
 */
async function db(text, params = []) {
  return pool.query(text, params);
}

/**
 * Get a dedicated database client.
 *
 * Useful when several queries must run
 * inside the same transaction.
 *
 * @returns {Promise<import("pg").PoolClient>}
 */
async function getClient() {
  return pool.connect();
}

/**
 * Run multiple operations inside a PostgreSQL transaction.
 *
 * The callback receives a dedicated client.
 *
 * @param {(client: import("pg").PoolClient) => Promise<any>} callback
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "[DB] Rollback error:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check whether the database is available.
 *
 * @returns {Promise<boolean>}
 */
async function isDatabaseAvailable() {
  if (!DATABASE_URL) {
    return false;
  }

  try {
    await pool.query("SELECT 1");
    return true;
  } catch (error) {
    console.error(
      "[DB] Connection check failed:",
      error.message
    );

    return false;
  }
}

/**
 * Return basic database status.
 *
 * @returns {Promise<object>}
 */
async function getDatabaseStatus() {
  if (!DATABASE_URL) {
    return {
      configured: false,
      connected: false
    };
  }

  try {
    const result = await pool.query(
      "SELECT NOW() AS server_time"
    );

    return {
      configured: true,
      connected: true,
      serverTime: result.rows[0]?.server_time || null
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error.message
    };
  }
}

/**
 * Gracefully close the PostgreSQL pool.
 */
async function closeDatabase() {
  try {
    await pool.end();
  } catch (error) {
    console.error(
      "[DB] Close error:",
      error.message
    );
  }
}

/**
 * Handle application shutdown.
 */
function registerDatabaseShutdown() {
  const shutdown = async (signal) => {
    console.log(
      `[DB] Received ${signal}. Closing database...`
    );

    await closeDatabase();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

registerDatabaseShutdown();

module.exports = {
  pool,
  db,
  getClient,
  transaction,
  isDatabaseAvailable,
  getDatabaseStatus,
  closeDatabase
};
