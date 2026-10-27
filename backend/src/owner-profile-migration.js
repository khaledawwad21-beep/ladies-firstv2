"use strict";

// One-time correction requested by the existing store owner. Keep later
// profile edits intact and never infer gender for other accounts.
async function migrateOwnerGender(client) {
  return client.query(`
    WITH corrected AS (
      UPDATE users
      SET gender = 'male', updated_at = NOW()
      WHERE LOWER(TRIM(email)) = 'khaledawwad21@gmail.com'
        AND (role = 'owner' OR is_owner = TRUE)
        AND NOT EXISTS (
          SELECT 1 FROM settings
          WHERE key = 'migration_owner_gender_20261027'
        )
      RETURNING id
    )
    INSERT INTO settings (key, value)
    SELECT 'migration_owner_gender_20261027',
      jsonb_build_object('userId', id, 'gender', 'male')
    FROM corrected
    ON CONFLICT (key) DO NOTHING
  `);
}

module.exports = { migrateOwnerGender };
