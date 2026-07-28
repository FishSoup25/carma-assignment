"use strict";

import { Router } from "express";

import type { ApiErrorResponse } from "@carma/shared";

import { getPool } from "../../db/pool.js";
import { seedSampleArticles } from "../../seed/seed-service.js";

/**
 * Create the admin router with development-only seed endpoint.
 */
export function createAdminRouter(): Router {
    const router = Router();

    router.post("/seed", createSeedHandler());

    return router;
}

/**
 * Handle POST /api/admin/seed requests.
 */
function createSeedHandler(): import("express").RequestHandler {
    return async function seedHandler(_request, response, next): Promise<void> {
        if (process.env.NODE_ENV === "production") {
            const body: ApiErrorResponse = {
                error: "seed_disabled",
                message: "Seed endpoint is disabled in production",
            };

            response.status(403).json(body);
            return;
        }

        try {
            const pool = getPool();
            const seedResult = await seedSampleArticles(pool);

            response.json(seedResult);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error("Unknown seed handler error"));
        }
    };
}
