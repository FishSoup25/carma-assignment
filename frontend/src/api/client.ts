"use strict";

import type { ApiErrorResponse } from "@carma/shared";

/**
 * Error thrown for non-OK API responses.
 */
export class ApiRequestError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(params: { status: number; code: string; message: string }) {
        super(params.message);
        this.name = "ApiRequestError";
        this.status = params.status;
        this.code = params.code;
    }
}

/**
 * Resolve the API base URL from Vite env, falling back to same-origin proxy paths.
 */
function getApiBaseUrl(): string {
    const configured = import.meta.env.VITE_API_BASE_URL;

    if (typeof configured === "string" && configured.trim() !== "") {
        const trimmed = configured.replace(/\/$/, "");
        return trimmed;
    }

    return "";
}

interface FetchJsonParams {
    path: string;
    method?: "GET" | "POST";
    query?: Record<string, string | number | boolean | undefined>;
}

/**
 * Build a URL with optional query parameters.
 */
function buildUrl(params: FetchJsonParams): string {
    const baseUrl = getApiBaseUrl();
    const url = new URL(params.path, baseUrl === "" ? window.location.origin : baseUrl);

    if (params.query !== undefined) {
        const entries = Object.entries(params.query);

        for (const [key, value] of entries) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }
    }

    if (baseUrl === "") {
        const relative = `${url.pathname}${url.search}`;
        return relative;
    }

    const absolute = url.toString();
    return absolute;
}

/**
 * The error fields this client relies on, each optional because a failure can
 * also come from a proxy or gateway that does not speak the API error contract.
 */
type PartialApiErrorResponse = Partial<ApiErrorResponse>;

/**
 * Read the error envelope from a failed response.
 *
 * A non-OK response may carry no body, or HTML from an intervening proxy, so a
 * decode failure is treated the same as a missing body: fall back to the status.
 */
async function toRequestError(response: Response): Promise<ApiRequestError> {
    let body: PartialApiErrorResponse = {};

    try {
        body = await response.json();
    } catch {
        body = {};
    }

    const requestError = new ApiRequestError({
        status: response.status,
        code: body.error ?? "request_failed",
        message: body.message ?? `Request failed with status ${response.status}`,
    });

    return requestError;
}

/**
 * Perform a JSON API request and parse the response body.
 *
 * The caller names the expected payload type. Response bodies are not validated
 * at runtime because the server owns both sides of the contract through the
 * shared response types; a schema mismatch is a deploy skew, not user input.
 */
export async function fetchJson<T>(params: FetchJsonParams): Promise<T> {
    const method = params.method ?? "GET";
    const url = buildUrl(params);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw await toRequestError(response);
        }

        const payload: T = await response.json();
        return payload;
    } catch (error) {
        if (error instanceof ApiRequestError) {
            throw error;
        }

        if (error instanceof Error) {
            throw new ApiRequestError({
                status: 0,
                code: "network_error",
                message: error.message,
            });
        }

        throw new ApiRequestError({
            status: 0,
            code: "network_error",
            message: "Unknown network error",
        });
    }
}
