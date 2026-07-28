"use strict";

import dotenv from "dotenv";
import pg from "pg";

import { seedSampleArticles } from "../src/seed/seed-service.js";

dotenv.config();

const { Pool } = pg;

/**
 * CLI entry point for seeding sample articles.
 */
async function runSeedCli(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl === undefined || databaseUrl.trim() === "") {
        throw new Error("DATABASE_URL is not configured");
    }

    const pool = new Pool({ connectionString: databaseUrl });

    try {
        const result = await seedSampleArticles(pool);
        console.log(`Seeded ${result.seeded} articles from sample_articles.json`);
        console.log(`Database now contains ${result.article_count} articles`);
    } finally {
        await pool.end();
    }
}

try {
    await runSeedCli();
} catch (error) {
    console.error("Failed to seed articles:", error);
    process.exit(1);
}
