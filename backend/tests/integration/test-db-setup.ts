"use strict";

import type pg from "pg";

import { countArticles } from "../../src/articles/aggregate-repository.js";

const SEEDED_ARTICLE_COUNT = 20;

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

/**
 * Prepare the database for an integration suite and fail loudly when the
 * sample articles are missing, since every id-based assertion depends on them.
 */
export async function prepareSeededDatabase(pool: pg.Pool): Promise<void> {
    await ensureEnrichmentColumns(pool);
    const articleCount = await countArticles(pool);

    if (articleCount !== SEEDED_ARTICLE_COUNT) {
        throw new Error(
            `Expected ${SEEDED_ARTICLE_COUNT} seeded articles but found ${articleCount}. `
            + "Run `npm run seed:articles` before integration tests.",
        );
    }
}

/**
 * Verify the articles table still exists after hostile input attempts.
 */
export async function articlesTableExists(pool: pg.Pool): Promise<boolean> {
    const existenceResult = await pool.query<{ exists: boolean }>(
        "SELECT to_regclass('public.articles') IS NOT NULL AS exists",
    );

    const exists = existenceResult.rows[0]?.exists ?? false;
    return exists;
}
