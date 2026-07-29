"use strict";

import type { Article, ArticleEnrichmentResponse, EnrichmentUsage } from "@carma/shared";
import type pg from "pg";

import { getEnrichmentConfig } from "./config.js";
import { resolveRequestCost } from "./cost.js";
import {
    isArticleEnriched,
    loadArticleForEnrichment,
    saveArticleEnrichment,
    sumTodayEnrichmentCost,
    toArticleEnrichment,
    toEnrichmentInput,
} from "./enrichment-repository.js";
import { EnrichmentError } from "./errors.js";
import { assertArticleHasContent, clampArticleText } from "./guards.js";
import { requestEnrichmentCompletion } from "./openrouter-client.js";
import { parseEnrichmentResponse } from "./parse-enrichment-response.js";
import { buildEnrichmentMessages } from "./prompt.js";
import { sanitizeArticleText } from "./sanitize.js";
import type { ChatMessage } from "./types.js";

/**
 * Parameters for executing article enrichment.
 */
export interface ExecuteArticleEnrichmentParams {
    articleId: number;
    force: boolean;
}

/**
 * Prompt messages for an article plus whether its text had to be truncated.
 */
export interface PreparedEnrichmentRequest {
    messages: ChatMessage[];
    truncated: boolean;
}

/**
 * Load an article by id or fail with a not-found enrichment error.
 */
async function loadArticleOrThrow(pool: pg.Pool, articleId: number): Promise<Article> {
    const article = await loadArticleForEnrichment(pool, articleId);

    if (article === null) {
        throw new EnrichmentError(
            "article_not_found",
            `Article ${articleId} was not found`,
        );
    }

    return article;
}

/**
 * Sanitize, validate, and clamp article text, then render the prompt messages.
 *
 * Shared by the live enrichment path and the CLI dry run so that inspecting a
 * prompt shows exactly what a real request would send.
 */
function prepareEnrichmentRequest(article: Article): PreparedEnrichmentRequest {
    const config = getEnrichmentConfig();
    const enrichmentInput = toEnrichmentInput(article);

    const sanitizedHeadline = sanitizeArticleText({ value: enrichmentInput.headline ?? "" });
    const sanitizedBody = sanitizeArticleText({ value: enrichmentInput.body ?? "" });

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

    const prepared: PreparedEnrichmentRequest = {
        messages,
        truncated: clampedText.headlineTruncated || clampedText.bodyTruncated,
    };

    return prepared;
}

/**
 * Read the enrichment fields back off a persisted article, or fail when a
 * column did not round-trip as expected.
 */
function readStoredEnrichment(
    article: Article,
    failureMessage: string,
): ArticleEnrichmentResponse["enrichment"] {
    const enrichment = toArticleEnrichment(article);

    if (enrichment === null) {
        throw new EnrichmentError("llm_schema_violation", failureMessage);
    }

    return enrichment;
}

/**
 * Build a cached enrichment response from stored article data.
 */
function buildCachedResponse(article: Article): ArticleEnrichmentResponse {
    const enrichment = readStoredEnrichment(article, "Stored enrichment data is incomplete");

    const usage: EnrichmentUsage = {
        prompt_tokens: article.prompt_tokens ?? 0,
        completion_tokens: article.completion_tokens ?? 0,
        cost_usd: article.cost_usd ?? 0,
    };

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
    const article = await loadArticleOrThrow(pool, params.articleId);

    if (isArticleEnriched(article) && !params.force) {
        const cachedResponse = buildCachedResponse(article);
        return cachedResponse;
    }

    await assertDailyBudget(pool);

    const config = getEnrichmentConfig();
    const prepared = prepareEnrichmentRequest(article);
    const completion = await requestEnrichmentCompletion({ messages: prepared.messages });
    const parsedFields = parseEnrichmentResponse(completion.content);

    const costUsd = resolveRequestCost({
        model: config.model,
        promptTokens: completion.promptTokens,
        completionTokens: completion.completionTokens,
        reportedCostUsd: completion.reportedCostUsd,
    });

    const usage: EnrichmentUsage = {
        prompt_tokens: completion.promptTokens,
        completion_tokens: completion.completionTokens,
        cost_usd: costUsd,
    };

    const updatedArticle = await saveArticleEnrichment(pool, {
        articleId: params.articleId,
        modelHandle: config.model,
        fields: parsedFields,
        usage,
    });

    const enrichment = readStoredEnrichment(updatedArticle, "Failed to persist enrichment data");

    const response: ArticleEnrichmentResponse = {
        article: updatedArticle,
        enrichment,
        usage,
        cached: false,
        truncated: prepared.truncated,
    };

    return response;
}

/**
 * Build enrichment messages for dry-run inspection without calling the LLM.
 */
export async function buildDryRunEnrichmentMessages(
    pool: pg.Pool,
    articleId: number,
): Promise<PreparedEnrichmentRequest> {
    const article = await loadArticleOrThrow(pool, articleId);
    const prepared = prepareEnrichmentRequest(article);

    return prepared;
}
