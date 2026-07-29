"use strict";

import type { Request, RequestHandler, Response } from "express";

/**
 * An async route body that writes its own response and throws on failure.
 */
export type AsyncRouteHandler = (request: Request, response: Response) => Promise<void>;

/**
 * Adapt an async route body into an Express handler that forwards rejections.
 *
 * Express 4 does not await handler promises, so an unhandled rejection would
 * hang the request instead of reaching the error middleware. Wrapping every
 * route here keeps that plumbing in one place, and normalizes non-Error throws
 * so the error handler only ever receives an Error.
 */
export function asyncRoute(handler: AsyncRouteHandler): RequestHandler {
    return async function asyncRouteHandler(request, response, next): Promise<void> {
        try {
            await handler(request, response);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error(`Unhandled non-Error thrown by ${request.method} ${request.path}`));
        }
    };
}
