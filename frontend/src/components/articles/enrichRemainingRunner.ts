"use strict";

import {
    enrichArticle,
    listUnenrichedArticleIds,
} from "../../api/articles.ts";
import { ApiRequestError } from "../../api/client.ts";
import {
    findEnrichmentErrorLabel,
    OTHER_ENRICHMENT_FAILURE_LABEL,
} from "../../utils/enrichmentErrors.ts";

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
    ok: boolean;
    errorCode: string | null;
}

interface RunEnrichRemainingParams {
    onProgress: (progress: EnrichRemainingProgress) => void;
}

/**
 * Enrich one article and normalize the outcome.
 *
 * A batch run must not abort on the first failure, so a rejection is reduced to
 * an error code the summary can group by.
 */
async function enrichOneArticle(articleId: number): Promise<EnrichOneResult> {
    try {
        await enrichArticle({ articleId });
        const successResult: EnrichOneResult = {
            ok: true,
            errorCode: null,
        };
        return successResult;
    } catch (error) {
        const failureResult: EnrichOneResult = {
            ok: false,
            errorCode: error instanceof ApiRequestError ? error.code : "enrichment_failed",
        };
        return failureResult;
    }
}

/**
 * Summarize concurrent enrichment failures as one note per distinct cause.
 *
 * A batch can fail hundreds of times for the same reason, so failures are
 * grouped by error code and reported as counts instead of individual messages.
 */
function buildFailureNotes(results: EnrichOneResult[]): string[] {
    const countsByLabel = new Map<string, number>();

    for (const result of results) {
        if (result.ok) {
            continue;
        }

        const label = findEnrichmentErrorLabel(result.errorCode) ?? OTHER_ENRICHMENT_FAILURE_LABEL;
        const previousCount = countsByLabel.get(label) ?? 0;
        countsByLabel.set(label, previousCount + 1);
    }

    const notes: string[] = [];

    for (const [label, count] of countsByLabel) {
        notes.push(`${count} failed: ${label}`);
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
