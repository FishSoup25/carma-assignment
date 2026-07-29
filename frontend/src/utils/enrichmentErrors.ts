"use strict";

/**
 * Human-readable explanations for the enrichment failures a user can act on.
 *
 * Codes come from the backend `EnrichmentError` contract. Any code missing here
 * falls back to the server-supplied message, so this map only needs entries
 * where a plain-language phrasing helps more than the raw API message.
 */
const ENRICHMENT_ERROR_LABELS: Record<string, string> = {
    llm_not_configured: "OPENROUTER_API_KEY is not set",
    budget_exceeded: "Daily LLM budget reached",
    llm_rate_limited: "Rate limited by the LLM provider",
    article_empty: "No usable headline or body",
};

/**
 * Fallback phrasing for failures without a friendly label, used when the
 * individual server messages are aggregated and cannot all be shown.
 */
export const OTHER_ENRICHMENT_FAILURE_LABEL = "Unexpected error";

/**
 * Resolve the friendly label for an enrichment error code, if one exists.
 */
export function findEnrichmentErrorLabel(code: string | null): string | null {
    if (code === null) {
        return null;
    }

    const label = ENRICHMENT_ERROR_LABELS[code];

    if (label === undefined) {
        return null;
    }

    return label;
}
