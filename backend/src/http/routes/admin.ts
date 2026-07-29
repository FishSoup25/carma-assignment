"use strict";

import type { ApiErrorResponse } from "@carma/shared";
import { Router } from "express";

import { getPool } from "../../db/pool.js";
import { seedSampleArticles } from "../../seed/seed-service.js";
import { asyncRoute } from "../async-route.js";

/**
 * Create the admin router with development-only seed endpoint.
 */
export function createAdminRouter(): Router {
    const router = Router();

    router.post("/seed", asyncRoute(async function seedHandler(_request, response): Promise<void> {
        if (process.env.NODE_ENV === "production") {
            const body: ApiErrorResponse = {
                error: "seed_disabled",
                message: "Seed endpoint is disabled in production",
            };

            response.status(403).json(body);
            return;
        }

        const seedResult = await seedSampleArticles(getPool());

        response.json(seedResult);
    }));

    return router;
}
