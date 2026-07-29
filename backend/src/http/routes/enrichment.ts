"use strict";

import { Router } from "express";

import { getPool } from "../../db/pool.js";
import { executeCostEstimate } from "../../enrichment/cost-estimate-service.js";
import { asyncRoute } from "../async-route.js";

/**
 * Create the enrichment router with cost estimate endpoint.
 */
export function createEnrichmentRouter(): Router {
    const router = Router();

    router.get("/cost-estimate", asyncRoute(async function costEstimateHandler(_request, response): Promise<void> {
        const estimate = await executeCostEstimate(getPool());

        response.json(estimate);
    }));

    return router;
}
