"use strict";

/**
 * Error codes for article enrichment failures.
 */
export type EnrichmentErrorCode =
    | "article_not_found"
    | "article_empty"
    | "llm_not_configured"
    | "llm_timeout"
    | "llm_request_failed"
    | "llm_rate_limited"
    | "llm_invalid_json"
    | "llm_schema_violation"
    | "llm_non_english_output"
    | "budget_exceeded";

/**
 * Structured error thrown when article enrichment cannot complete.
 */
export class EnrichmentError extends Error {
    public readonly code: EnrichmentErrorCode;

    /**
     * Create an enrichment error with a machine-readable code.
     */
    public constructor(code: EnrichmentErrorCode, message: string) {
        super(message);
        this.name = "EnrichmentError";
        this.code = code;
    }
}
