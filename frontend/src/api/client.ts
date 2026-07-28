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
export function getApiBaseUrl(): string {
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
 * Perform a JSON API request and parse the response body.
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

        let body: unknown = null;

        try {
            body = await response.json();
        } catch {
            body = null;
        }

        if (!response.ok) {
            const errorBody = body as ApiErrorResponse | null;
            const code = errorBody?.error ?? "request_failed";
            const message = errorBody?.message ?? `Request failed with status ${response.status}`;
            throw new ApiRequestError({
                status: response.status,
                code,
                message,
            });
        }

        return body as T;
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
