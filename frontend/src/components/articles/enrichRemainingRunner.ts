"use strict";

import {
    enrichArticle,
    listUnenrichedArticleIds,
} from "../../api/articles.ts";
import { ApiRequestError } from "../../api/client.ts";

export interface EnrichRemainingProgress {
    total: number;
    completed: number;
    failed: number;
}

export interface EnrichRemainingSummary {
    total: number;
    completed: number;
    failed: number;
    notes: string[];
}

interface EnrichOneResult {
    articleId: number;
    ok: boolean;
    errorCode: string | null;
    errorMessage: string | null;
}

interface RunEnrichRemainingParams {
    onProgress: (progress: EnrichRemainingProgress) => void;
}

/**
 * Enrich one article and normalize the outcome.
 */
async function enrichOneArticle(articleId: number): Promise<EnrichOneResult> {
    try {
        await enrichArticle({ articleId });
        const successResult: EnrichOneResult = {
            articleId,
            ok: true,
            errorCode: null,
            errorMessage: null,
        };
        return successResult;
    } catch (error) {
        if (error instanceof ApiRequestError) {
            const failureResult: EnrichOneResult = {
                articleId,
                ok: false,
                errorCode: error.code,
                errorMessage: error.message,
            };
            return failureResult;
        }

        const message = error instanceof Error ? error.message : "Unknown enrichment error";
        const failureResult: EnrichOneResult = {
            articleId,
            ok: false,
            errorCode: "enrichment_failed",
            errorMessage: message,
        };
        return failureResult;
    }
}

/**
 * Build human-readable notes from concurrent enrichment failures.
 */
function buildFailureNotes(results: EnrichOneResult[]): string[] {
    let missingKeyCount = 0;
    let budgetCount = 0;
    let rateLimitedCount = 0;
    let otherCount = 0;

    for (const result of results) {
        if (result.ok) {
            continue;
        }

        if (result.errorCode === "llm_not_configured") {
            missingKeyCount = missingKeyCount + 1;
        } else if (result.errorCode === "budget_exceeded") {
            budgetCount = budgetCount + 1;
        } else if (result.errorCode === "llm_rate_limited") {
            rateLimitedCount = rateLimitedCount + 1;
        } else {
            otherCount = otherCount + 1;
        }
    }

    const notes: string[] = [];

    if (missingKeyCount > 0) {
        notes.push(`${missingKeyCount} failed: OPENROUTER_API_KEY is not set`);
    }

    if (budgetCount > 0) {
        notes.push(`${budgetCount} failed: daily LLM budget reached`);
    }

    if (rateLimitedCount > 0) {
        notes.push(`${rateLimitedCount} failed: rate limited by the LLM provider`);
    }

    if (otherCount > 0) {
        notes.push(`${otherCount} failed for other reasons`);
    }

    return notes;
}

/**
 * Count completed and failed outcomes from settled enrich results.
 */
function countSettledResults(results: EnrichOneResult[]): {
    completed: number;
    failed: number;
} {
    let completed = 0;
    let failed = 0;

    for (const result of results) {
        if (result.ok) {
            completed = completed + 1;
        } else {
            failed = failed + 1;
        }
    }

    const counts = { completed, failed };
    return counts;
}

/**
 * Enrich one article and report progress after it settles.
 */
async function enrichAndTrackArticle(params: {
    articleId: number;
    total: number;
    liveCompleted: { value: number };
    liveFailed: { value: number };
    onProgress: (progress: EnrichRemainingProgress) => void;
}): Promise<EnrichOneResult> {
    const result = await enrichOneArticle(params.articleId);

    if (result.ok) {
        params.liveCompleted.value = params.liveCompleted.value + 1;
    } else {
        params.liveFailed.value = params.liveFailed.value + 1;
    }

    params.onProgress({
        total: params.total,
        completed: params.liveCompleted.value,
        failed: params.liveFailed.value,
    });

    return result;
}

/**
 * Load unenriched article ids and enrich them all concurrently.
 */
export async function runEnrichRemaining(
    params: RunEnrichRemainingParams,
): Promise<EnrichRemainingSummary> {
    params.onProgress({
        total: 0,
        completed: 0,
        failed: 0,
    });

    const articleIds = await listUnenrichedArticleIds();

    if (articleIds.length === 0) {
        const emptySummary: EnrichRemainingSummary = {
            total: 0,
            completed: 0,
            failed: 0,
            notes: [],
        };
        return emptySummary;
    }

    params.onProgress({
        total: articleIds.length,
        completed: 0,
        failed: 0,
    });

    const liveCompleted = { value: 0 };
    const liveFailed = { value: 0 };
    const enrichPromises: Array<Promise<EnrichOneResult>> = [];

    for (const articleId of articleIds) {
        enrichPromises.push(enrichAndTrackArticle({
            articleId,
            total: articleIds.length,
            liveCompleted,
            liveFailed,
            onProgress: params.onProgress,
        }));
    }

    const settledResults = await Promise.all(enrichPromises);
    const counts = countSettledResults(settledResults);

    const summary: EnrichRemainingSummary = {
        total: articleIds.length,
        completed: counts.completed,
        failed: counts.failed,
        notes: buildFailureNotes(settledResults),
    };

    return summary;
}
