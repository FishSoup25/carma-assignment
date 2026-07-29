"use strict";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { SeedArticlesResponse } from "@carma/shared";
import type pg from "pg";

import { countArticles } from "../articles/aggregate-repository.js";

interface SampleArticleRecord {
    id: number;
    headline: string;
    body: string;
    source: string;
    published_at: string;
    language: string;
}

/**
 * A sample record ready for insertion, with blank text collapsed to NULL.
 */
interface SeedArticleRow extends Omit<SampleArticleRecord, "headline" | "body"> {
    headline: string | null;
    body: string | null;
}

/**
 * Resolve the repository root from this module location.
 */
function resolveRepoRoot(): string {
    const currentFilePath = fileURLToPath(import.meta.url);
    const seedDirectory = path.dirname(currentFilePath);
    const srcDirectory = path.dirname(seedDirectory);
    const backendDirectory = path.dirname(srcDirectory);
    const repoRoot = path.dirname(backendDirectory);
    return repoRoot;
}

/**
 * Load sample articles from the documents directory.
 */
async function loadSampleArticles(): Promise<SampleArticleRecord[]> {
    const repoRoot = resolveRepoRoot();
    const sampleFilePath = path.join(repoRoot, "documents", "sample_articles.json");
    const fileContents = await readFile(sampleFilePath, "utf8");
    const parsedData: SampleArticleRecord[] = JSON.parse(fileContents);

    if (!Array.isArray(parsedData)) {
        throw new Error("sample_articles.json must contain a JSON array");
    }

    return parsedData;
}

/**
 * Normalize a validated sample article for database insertion, storing blank
 * headline and body text as NULL so "missing" and "empty" are not two states.
 */
function normalizeSampleArticle(record: SampleArticleRecord): SeedArticleRow {
    const headline: string | null = record.headline.trim() === "" ? null : record.headline;
    const body: string | null = record.body.trim() === "" ? null : record.body;

    const normalizedRow: SeedArticleRow = {
        id: record.id,
        headline,
        body,
        source: record.source,
        published_at: record.published_at,
        language: record.language,
    };

    return normalizedRow;
}

/**
 * Validate that a sample article has the required fields.
 */
function validateSampleArticle(record: SampleArticleRecord, index: number): void {
    if (typeof record.id !== "number") {
        throw new Error(`Article at index ${index} is missing a numeric id`);
    }

    if (typeof record.headline !== "string") {
        throw new Error(`Article ${record.id} is missing a headline string`);
    }

    if (typeof record.body !== "string") {
        throw new Error(`Article ${record.id} is missing a body string`);
    }

    if (typeof record.source !== "string" || record.source.trim() === "") {
        throw new Error(`Article ${record.id} is missing a non-empty source`);
    }

    if (typeof record.published_at !== "string" || record.published_at.trim() === "") {
        throw new Error(`Article ${record.id} is missing published_at`);
    }

    if (typeof record.language !== "string" || record.language.trim() === "") {
        throw new Error(`Article ${record.id} is missing language`);
    }
}

/**
 * Upsert a single article row into the database.
 */
async function upsertArticle(
    pool: pg.Pool,
    row: SeedArticleRow,
): Promise<void> {
    const upsertQuery = `
    INSERT INTO articles (
      id,
      headline,
      body,
      source,
      published_at,
      language,
      model_handle,
      summary,
      sentiment,
      topic_tags
    )
    VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET
      headline = EXCLUDED.headline,
      body = EXCLUDED.body,
      source = EXCLUDED.source,
      published_at = EXCLUDED.published_at,
      language = EXCLUDED.language
  `;

    await pool.query(upsertQuery, [
        row.id,
        row.headline,
        row.body,
        row.source,
        row.published_at,
        row.language,
    ]);
}

/**
 * Seed articles from sample_articles.json into PostgreSQL.
 */
export async function seedSampleArticles(pool: pg.Pool): Promise<SeedArticlesResponse> {
    const sampleRecords = await loadSampleArticles();
    let seeded = 0;

    for (const record of sampleRecords) {
        validateSampleArticle(record, seeded);
        const normalizedRow = normalizeSampleArticle(record);
        await upsertArticle(pool, normalizedRow);
        seeded = seeded + 1;
    }

    const articleCount = await countArticles(pool);

    const response: SeedArticlesResponse = {
        seeded,
        article_count: articleCount,
    };

    return response;
}
