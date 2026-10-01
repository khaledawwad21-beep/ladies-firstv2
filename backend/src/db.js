"use strict";

const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  console.warn(
    "[DB] WARNING: DATABASE_URL is not configured."
  );
}

const pool = new Pool({
  connectionString:
    DATABASE_URL || undefined,

  ssl: DATABASE_URL
    ? {
        rejectUnauthorized: false
      }
    : false,

  max: Number(
    process.env.DB_POOL_MAX || 10
  ),

  idleTimeoutMillis: Number(
    process.env.DB_IDLE_TIMEOUT || 30000
  ),

  connectionTimeoutMillis: Number(
    process.env.DB_CONNECTION_TIMEOUT || 10000
  )
});

/* =========================================================
   DATABASE QUERY
========================================================= */

async function db(
  text,
  params = []
) {
  return pool.query(
    text,
    params
  );
}

/* =========================================================
   CLIENT
========================================================= */

async function getClient() {
  return pool.connect();
}

/* =========================================================
   TRANSACTION
========================================================= */

async function transaction(
  callback
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const result =
      await callback(client);

    await client.query(
      "COMMIT"
    );

    return result;
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
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

/* =========================================================
   DATABASE AVAILABILITY
========================================================= */

async function isDatabaseAvailable() {
  if (!DATABASE_URL) {
    return false;
  }

  try {
    await pool.query(
      "SELECT 1"
    );

    return true;
  } catch (error) {
    console.error(
      "[DB] Connection check failed:",
      error.message
    );

    return false;
  }
}

/* =========================================================
   DATABASE STATUS
========================================================= */

async function getDatabaseStatus() {
  if (!DATABASE_URL) {
    return {
      configured: false,
      connected: false,
      serverTime: null
    };
  }

  try {
    const result =
      await pool.query(
        "SELECT NOW() AS server_time"
      );

    return {
      configured: true,
      connected: true,
      serverTime:
        result.rows[0]?.server_time ||
        null
    };
  } catch (error) {
    console.error(
      "[DB] Status check failed:",
      error.message
    );

    return {
      configured: true,
      connected: false,
      serverTime: null,
      error: error.message
    };
  }
}

/* =========================================================
   CLOSE DATABASE
========================================================= */

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

/* =========================================================
   DATABASE SHUTDOWN
========================================================= */

let shutdownRegistered = false;

function registerDatabaseShutdown() {
  if (shutdownRegistered) {
    return;
  }

  shutdownRegistered = true;

  const shutdown =
    async (signal) => {
      console.log(
        `[DB] Received ${signal}. Closing database...`
      );

      await closeDatabase();
    };

  process.once(
    "SIGINT",
    () => shutdown("SIGINT")
  );

  process.once(
    "SIGTERM",
    () => shutdown("SIGTERM")
  );
}

registerDatabaseShutdown();

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  pool,
  db,
  getClient,
  transaction,
  isDatabaseAvailable,
  getDatabaseStatus,
  closeDatabase
};
