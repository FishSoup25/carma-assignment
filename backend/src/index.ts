"use strict";

import dotenv from "dotenv";

import { createApp } from "./app.js";

dotenv.config();

const PORT = Number(process.env.PORT ?? 4474);

const app = createApp();

/**
 * Start the HTTP server.
 */
async function startServer(): Promise<void> {
    app.listen(PORT, function onListen(): void {
        console.log(`Backend listening on http://localhost:${PORT}`);
    });
}

try {
    await startServer();
} catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
}
