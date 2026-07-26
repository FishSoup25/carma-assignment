'use strict';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const PORT = Number(process.env.PORT ?? 3000);

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Health check endpoint for container orchestration and local dev.
 */
function createHealthHandler(): express.RequestHandler {
  return function healthHandler(_request, response): void {
    response.json({
      status: 'ok',
      service: 'carma-media-signal-service',
    });
  };
}

app.get('/health', createHealthHandler());

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
  console.error('Failed to start server:', error);
  process.exit(1);
}
