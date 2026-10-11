"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { encryptBackup, decryptBackup } = require("./backup-crypto");

function postgresTool(tool, args, { connection, input } = {}) {
  // URLs remain in environment variables; never print credentials or database content.
  const parameters = connection ? new URL(connection) : null;
  const env = {
    ...process.env,
    PGDATABASE: parameters ? decodeURIComponent(parameters.pathname.slice(1)) : "",
    PGHOST: parameters ? parameters.hostname : "",
    PGPORT: parameters ? (parameters.port || "5432") : "",
    PGUSER: parameters ? decodeURIComponent(parameters.username) : "",
    PGPASSWORD: parameters ? decodeURIComponent(parameters.password) : "",
    PGSSLMODE: parameters ? "verify-full" : "",
    PGSSLROOTCERT: "/etc/ssl/certs/ca-certificates.crt"
  };
  const result = spawnSync("docker", ["run", "--rm", "-i", "--network", "host",
    "-e", "PGDATABASE", "-e", "PGHOST", "-e", "PGPORT", "-e", "PGUSER",
    "-e", "PGPASSWORD", "-e", "PGSSLMODE", "-e", "PGSSLROOTCERT",
    "postgres:18", tool, ...args], {
    env, input, maxBuffer: 512 * 1024 * 1024, timeout: 10 * 60 * 1000
  });
  if (result.error || result.status !== 0) throw new Error(`${tool} failed; inspect connectivity and PostgreSQL version (credentials suppressed)`);
  return result.stdout;
}

function main() {
  const [operation, filename] = process.argv.slice(2);
  if (!filename || !["create", "verify"].includes(operation)) throw new Error("Usage: database-backup.js create|verify FILE");
  const password = process.env.BACKUP_ENCRYPTION_KEY;
  if (!password || password.length < 32) throw new Error("A backup encryption key of at least 32 characters is required");
  if (operation === "create") {
    const connection = process.env.BACKUP_DATABASE_URL;
    if (!connection) throw new Error("BACKUP_DATABASE_URL is required; production backup is not configured");
    const url = new URL(connection);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Expected PostgreSQL URL");
    // Reject URL-level overrides which could disable the required TLS policy.
    for (const parameter of ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(parameter);
    const archive = postgresTool("pg_dump", ["--format=custom", "--no-owner", "--no-acl"], { connection: url.toString() });
    if (archive.subarray(0, 5).toString() !== "PGDMP") throw new Error("Invalid PostgreSQL dump");
    const encrypted = encryptBackup(archive, password);
    const roundTrip = decryptBackup(encrypted, password);
    if (!archive.equals(roundTrip)) throw new Error("Backup encryption verification failed");
    postgresTool("pg_restore", ["--list"], { input: roundTrip });
    fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    fs.writeFileSync(filename, encrypted, { mode: 0o600, flag: "wx" });
    console.log("Encrypted PostgreSQL backup created and archive verified. No production data was modified.");
  } else {
    const archive = decryptBackup(fs.readFileSync(filename), password);
    postgresTool("pg_restore", ["--list"], { input: archive });
    console.log("Backup authentication, decryption and PostgreSQL archive checks passed.");
  }
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { postgresTool };
