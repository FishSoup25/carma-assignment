"use strict";

import { Router } from "express";

import { getPool } from "../../db/pool.js";
import { executeCostEstimate } from "../../enrichment/cost-estimate-service.js";

/**
 * Create the enrichment router with cost estimate endpoint.
 */
export function createEnrichmentRouter(): Router {
    const router = Router();

    router.get("/cost-estimate", createCostEstimateHandler());

    return router;
}

/**
 * Handle GET /api/enrichment/cost-estimate requests.
 */
function createCostEstimateHandler(): import("express").RequestHandler {
    return async function costEstimateHandler(_request, response, next): Promise<void> {
        try {
            const pool = getPool();
            const estimate = await executeCostEstimate(pool);

            response.json(estimate);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error("Unknown cost estimate handler error"));
        }
    };
}
