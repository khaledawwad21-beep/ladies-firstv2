"use strict";

const crypto = require("node:crypto");
const MAGIC = Buffer.from("LFBACK01");

function keyFor(password, salt) {
  if (typeof password !== "string" || password.length < 32) {
    throw new Error("BACKUP_ENCRYPTION_KEY must contain at least 32 characters");
  }
  return crypto.scryptSync(password, salt, 32);
}

function encryptBackup(data, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const header = Buffer.concat([MAGIC, salt, iv]);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFor(password, salt), iv);
  cipher.setAAD(header);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([header, cipher.getAuthTag(), encrypted]);
}

function decryptBackup(data, password) {
  if (data.length < 52 || !data.subarray(0, 8).equals(MAGIC)) throw new Error("Invalid backup format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFor(password, data.subarray(8, 24)), data.subarray(24, 36));
  decipher.setAAD(data.subarray(0, 36));
  decipher.setAuthTag(data.subarray(36, 52));
  return Buffer.concat([decipher.update(data.subarray(52)), decipher.final()]);
}

module.exports = { encryptBackup, decryptBackup };
