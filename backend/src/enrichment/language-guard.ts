"use strict";

import { EnrichmentError } from "./errors.js";

const NON_LATIN_SCRIPT_PATTERNS: RegExp[] = [
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u,
    /[\u0590-\u05FF]/u,
    /[\u0400-\u04FF]/u,
    /[\u0370-\u03FF]/u,
    /[\u0900-\u097F]/u,
    /[\u0E00-\u0E7F]/u,
    /[\u4E00-\u9FFF]/u,
    /[\u3040-\u309F\u30A0-\u30FF]/u,
    /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/u,
];

/**
 * Parameters for asserting enrichment output is in English.
 */
export interface AssertEnglishOutputParams {
    summary: string;
    topicTags: string[];
}

/**
 * Return true when text contains non-Latin script characters.
 */
function containsNonLatinScript(value: string): boolean {
    for (const pattern of NON_LATIN_SCRIPT_PATTERNS) {
        if (pattern.test(value)) {
            return true;
        }
    }

    return false;
}

/**
 * Throw when summary or topic tags contain non-Latin script characters.
 */
export function assertEnglishOutput(params: AssertEnglishOutputParams): void {
    if (containsNonLatinScript(params.summary)) {
        throw new EnrichmentError(
            "llm_non_english_output",
            "LLM summary must be written in English",
        );
    }

    for (const tag of params.topicTags) {
        if (containsNonLatinScript(tag)) {
            throw new EnrichmentError(
                "llm_non_english_output",
                "LLM topic tags must be written in English",
            );
        }
    }
}
