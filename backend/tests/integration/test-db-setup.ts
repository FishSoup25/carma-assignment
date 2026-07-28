"use strict";

import type pg from "pg";

/**
 * Ensure enrichment telemetry columns exist for integration tests.
 */
export async function ensureEnrichmentColumns(pool: pg.Pool): Promise<void> {
    const migrationSql = `
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS completion_tokens INTEGER;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 6);
  `;

    await pool.query(migrationSql);
}
