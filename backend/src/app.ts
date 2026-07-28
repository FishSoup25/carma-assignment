"use strict";

import cors from "cors";
import express from "express";

import { createAdminRouter } from "./http/routes/admin.js";
import { createArticlesRouter } from "./http/routes/articles.js";
import { createEnrichmentRouter } from "./http/routes/enrichment.js";
import { errorHandler } from "./http/error-handler.js";

/**
 * Create and configure the Express application.
 */
export function createApp(): express.Express {
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.get("/health", createHealthHandler());
    app.use("/api/articles", createArticlesRouter());
    app.use("/api/admin", createAdminRouter());
    app.use("/api/enrichment", createEnrichmentRouter());
    app.use(errorHandler);

    return app;
}

/**
 * Health check endpoint for container orchestration and local dev.
 */
function createHealthHandler(): express.RequestHandler {
    return function healthHandler(_request, response): void {
        response.json({
            status: "ok",
            service: "carma-media-signal-service",
        });
    };
}
