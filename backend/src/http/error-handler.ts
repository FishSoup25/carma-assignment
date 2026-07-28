"use strict";

import type { ApiErrorResponse } from "@carma/shared";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { BooleanQueryError } from "../search/errors.js";

/**
 * Map a boolean query error code to an HTTP status code.
 */
function statusCodeForBooleanQueryError(code: BooleanQueryError["code"]): number {
    if (code === "query_too_long" || code === "term_too_long" || code === "too_many_terms") {
        return 413;
    }

    if (code === "query_too_deep" || code === "unsupported_query") {
        return 422;
    }

    return 400;
}

/**
 * Express error handler mapping domain errors to ApiErrorResponse.
 */
export function errorHandler(
    error: Error,
    _request: Request,
    response: Response,
    _next: NextFunction,
): void {
    if (error instanceof BooleanQueryError) {
        const statusCode = statusCodeForBooleanQueryError(error.code);
        const body: ApiErrorResponse = {
            error: error.code,
            message: error.message,
        };

        response.status(statusCode).json(body);
        return;
    }

    if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const message = firstIssue?.message ?? "Invalid request parameters";
        const body: ApiErrorResponse = {
            error: "validation_error",
            message,
        };

        response.status(400).json(body);
        return;
    }

    console.error("Unhandled error:", error);

    const body: ApiErrorResponse = {
        error: "internal_error",
        message: "An unexpected error occurred",
    };

    response.status(500).json(body);
}
