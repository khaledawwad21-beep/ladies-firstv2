'use strict';

function databaseConnectionOptions(env) {
  if (!env.DATABASE_URL) return { connectionString: undefined, ssl: false };
  let url;
  try { url = new URL(env.DATABASE_URL); }
  catch { throw new Error('DATABASE_URL is invalid'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
  const disabled = String(env.DB_SSL || '').trim().toLowerCase() === 'false';
  if (disabled && env.NODE_ENV === 'production') throw new Error('DB_SSL=false is not permitted in production');
  // pg URL SSL parameters replace the supplied ssl object. Remove them so a
  // connection string cannot silently downgrade this policy.
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) url.searchParams.delete(key);
  // Render internal certificates are self-signed. This exception is restricted
  // to Render runtime and its single-label private Postgres hostname.
  const renderInternal = env.RENDER === 'true' && /^dpg-[a-z0-9-]+$/.test(url.hostname);
  const ca = String(env.DB_SSL_CA || '').replace(/\\n/g, '\n').trim();
  return {
    connectionString: url.toString(),
    ssl: disabled ? false : {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: !!ca || !renderInternal,
      ...(ca ? { ca } : {})
    }
  };
}
module.exports = { databaseConnectionOptions };
