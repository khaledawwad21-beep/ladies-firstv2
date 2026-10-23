"use strict";
const fs = require("node:fs");
const crypto = require("node:crypto");
const { Client } = require("pg");

async function fingerprint(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    const result = {};
    for (const { tablename } of tables.rows) {
      const quoted = '"' + tablename.replaceAll('"', '""') + '"';
      const rows = await client.query(`SELECT to_jsonb(t)::text AS value FROM public.${quoted} t ORDER BY to_jsonb(t)::text COLLATE "C"`);
      const hash = crypto.createHash("sha256");
      for (const row of rows.rows) hash.update(row.value + "\n");
      result[tablename] = { rows: rows.rowCount, sha256: hash.digest("hex") };
    }
    const sequences = await client.query("SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename");
    for (const { sequencename } of sequences.rows) {
      const quoted = '"' + sequencename.replaceAll('"', '""') + '"';
      result[`sequence:${sequencename}`] = (await client.query(`SELECT last_value::text, is_called FROM public.${quoted}`)).rows[0];
    }
    await client.query("COMMIT");
    return result;
  } finally { await client.end(); }
}

if (require.main === module) {
  fingerprint(process.env.DATABASE_URL).then(result => {
    if (!result.orders?.rows || !result.products?.rows) throw new Error("Restore drill requires populated orders and products");
    fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2), { mode: 0o600 });
    console.log("Database tables and sequences fingerprinted without logging customer records.");
  }).catch(() => { console.error("Database fingerprint failed"); process.exitCode = 1; });
}
module.exports = { fingerprint };
