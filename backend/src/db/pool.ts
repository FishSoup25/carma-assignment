"use strict";

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const STATEMENT_TIMEOUT_MS = 5000;

let poolInstance: pg.Pool | null = null;

/**
 * Create a new PostgreSQL connection pool.
 */
function createPool(): pg.Pool {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl === undefined || databaseUrl.trim() === "") {
        throw new Error("DATABASE_URL is not configured");
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        statement_timeout: STATEMENT_TIMEOUT_MS,
    });

    return pool;
}

/**
 * Return the shared PostgreSQL connection pool singleton.
 */
export function getPool(): pg.Pool {
    if (poolInstance === null) {
        poolInstance = createPool();
    }

    return poolInstance;
}

/**
 * Close the shared pool, primarily for test teardown.
 */
export async function closePool(): Promise<void> {
    if (poolInstance !== null) {
        await poolInstance.end();
        poolInstance = null;
    }
}
