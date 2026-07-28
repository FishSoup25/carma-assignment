"use strict";

import type { ArticleEnrichmentResponse, EnrichmentUsage } from "@carma/shared";
import type pg from "pg";

import { resolveRequestCost } from "./cost.js";
import { getEnrichmentConfig } from "./config.js";
import { EnrichmentError } from "./errors.js";
import {
    isArticleEnriched,
    loadArticleForEnrichment,
    saveArticleEnrichment,
    sumTodayEnrichmentCost,
    toArticleEnrichment,
    toEnrichmentInput,
} from "./enrichment-repository.js";
import { assertArticleHasContent, clampArticleText } from "./guards.js";
import { requestEnrichmentCompletion } from "./openrouter-client.js";
import { parseEnrichmentResponse } from "./parse-enrichment-response.js";
import { buildEnrichmentMessages } from "./prompt.js";
import { sanitizeArticleText } from "./sanitize.js";

/**
 * Parameters for executing article enrichment.
 */
export interface ExecuteArticleEnrichmentParams {
    articleId: number;
    force: boolean;
}

/**
 * Build EnrichmentUsage from token and cost values.
 */
function buildEnrichmentUsage(
    promptTokens: number,
    completionTokens: number,
    costUsd: number,
): EnrichmentUsage {
    const usage: EnrichmentUsage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: costUsd,
    };

    return usage;
}

/**
 * Build a cached enrichment response from stored article data.
 */
function buildCachedResponse(article: NonNullable<Awaited<ReturnType<typeof loadArticleForEnrichment>>>): ArticleEnrichmentResponse {
    const enrichment = toArticleEnrichment(article);

    if (enrichment === null) {
        throw new EnrichmentError(
            "llm_schema_violation",
            "Stored enrichment data is incomplete",
        );
    }

    const usage = buildEnrichmentUsage(
        article.prompt_tokens ?? 0,
        article.completion_tokens ?? 0,
        article.cost_usd ?? 0,
    );

    const response: ArticleEnrichmentResponse = {
        article,
        enrichment,
        usage,
        cached: true,
        truncated: false,
    };

    return response;
}

/**
 * Assert the daily enrichment budget has not been exceeded.
 */
async function assertDailyBudget(pool: pg.Pool): Promise<void> {
    const config = getEnrichmentConfig();
    const spentToday = await sumTodayEnrichmentCost(pool);

    if (spentToday >= config.dailyBudgetUsd) {
        throw new EnrichmentError(
            "budget_exceeded",
            `Daily enrichment budget of $${config.dailyBudgetUsd} has been exceeded`,
        );
    }
}

/**
 * Enrich a single article via OpenRouter and persist the result.
 */
export async function executeArticleEnrichment(
    pool: pg.Pool,
    params: ExecuteArticleEnrichmentParams,
): Promise<ArticleEnrichmentResponse> {
    const article = await loadArticleForEnrichment(pool, params.articleId);

    if (article === null) {
        throw new EnrichmentError(
            "article_not_found",
            `Article ${params.articleId} was not found`,
        );
    }

    if (isArticleEnriched(article) && !params.force) {
        const cachedResponse = buildCachedResponse(article);
        return cachedResponse;
    }

    await assertDailyBudget(pool);

    const config = getEnrichmentConfig();
    const enrichmentInput = toEnrichmentInput(article);

    const sanitizedHeadline = sanitizeArticleText({
        value: enrichmentInput.headline ?? "",
    });
    const sanitizedBody = sanitizeArticleText({
        value: enrichmentInput.body ?? "",
    });

    assertArticleHasContent({
        headline: sanitizedHeadline,
        body: sanitizedBody,
    });

    const clampedText = clampArticleText({
        headline: sanitizedHeadline,
        body: sanitizedBody,
        maxHeadlineChars: config.maxHeadlineChars,
        maxBodyChars: config.maxBodyChars,
    });

    const messages = buildEnrichmentMessages({
        article: enrichmentInput,
        headline: clampedText.headline,
        body: clampedText.body,
    });

    const completion = await requestEnrichmentCompletion({ messages });
    const parsedFields = parseEnrichmentResponse(completion.content);

    const costUsd = resolveRequestCost({
        model: config.model,
        promptTokens: completion.promptTokens,
        completionTokens: completion.completionTokens,
        reportedCostUsd: completion.reportedCostUsd,
    });

    const usage = buildEnrichmentUsage(
        completion.promptTokens,
        completion.completionTokens,
        costUsd,
    );

    const updatedArticle = await saveArticleEnrichment(pool, {
        articleId: params.articleId,
        modelHandle: config.model,
        fields: parsedFields,
        usage,
    });

    const enrichment = toArticleEnrichment(updatedArticle);

    if (enrichment === null) {
        throw new EnrichmentError(
            "llm_schema_violation",
            "Failed to persist enrichment data",
        );
    }

    const truncated = clampedText.headlineTruncated || clampedText.bodyTruncated;

    const response: ArticleEnrichmentResponse = {
        article: updatedArticle,
        enrichment,
        usage,
        cached: false,
        truncated,
    };

    return response;
}

/**
 * Build enrichment messages for dry-run inspection without calling the LLM.
 */
export async function buildDryRunEnrichmentMessages(
    pool: pg.Pool,
    articleId: number,
): Promise<{
    messages: ReturnType<typeof buildEnrichmentMessages>;
    truncated: boolean;
}> {
    const article = await loadArticleForEnrichment(pool, articleId);

    if (article === null) {
        throw new EnrichmentError(
            "article_not_found",
            `Article ${articleId} was not found`,
        );
    }

    const config = getEnrichmentConfig();
    const enrichmentInput = toEnrichmentInput(article);

    const sanitizedHeadline = sanitizeArticleText({
        value: enrichmentInput.headline ?? "",
    });
    const sanitizedBody = sanitizeArticleText({
        value: enrichmentInput.body ?? "",
    });

    assertArticleHasContent({
        headline: sanitizedHeadline,
        body: sanitizedBody,
    });

    const clampedText = clampArticleText({
        headline: sanitizedHeadline,
        body: sanitizedBody,
        maxHeadlineChars: config.maxHeadlineChars,
        maxBodyChars: config.maxBodyChars,
    });

    const messages = buildEnrichmentMessages({
        article: enrichmentInput,
        headline: clampedText.headline,
        body: clampedText.body,
    });

    const truncated = clampedText.headlineTruncated || clampedText.bodyTruncated;
    const result = {
        messages,
        truncated,
    };

    return result;
}
