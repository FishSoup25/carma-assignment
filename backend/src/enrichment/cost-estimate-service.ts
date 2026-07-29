"use strict";

import type { EnrichmentCostEstimateResponse } from "@carma/shared";
import type pg from "pg";

import { getEnrichmentGuardrails } from "./config.js";
import { getModelPricing } from "./cost.js";
import { sumTodayEnrichmentCost } from "./enrichment-repository.js";

const PROJECTED_DAILY_ARTICLES = 50_000;
const DAYS_PER_MONTH = 30;

interface EnrichmentStatsRow {
    article_count: string;
    enriched_count: string;
    average_prompt_tokens: string | null;
    average_completion_tokens: string | null;
    average_cost_usd: string | null;
    total_spent_usd: string | null;
}

/**
 * Parse a numeric SQL aggregate value, defaulting to 0.
 */
function parseAggregateNumber(rawValue: string | null | undefined): number {
    const parsed = Number(rawValue ?? "0");

    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return parsed;
}

/**
 * Load aggregate enrichment stats from PostgreSQL.
 */
async function loadEnrichmentStats(pool: pg.Pool): Promise<EnrichmentStatsRow | undefined> {
    const statsSql = `
    SELECT
      COUNT(*)::text AS article_count,
      COUNT(enriched_at)::text AS enriched_count,
      AVG(prompt_tokens) FILTER (WHERE enriched_at IS NOT NULL)::text AS average_prompt_tokens,
      AVG(completion_tokens) FILTER (WHERE enriched_at IS NOT NULL)::text AS average_completion_tokens,
      AVG(cost_usd) FILTER (WHERE enriched_at IS NOT NULL)::text AS average_cost_usd,
      COALESCE(SUM(cost_usd) FILTER (WHERE enriched_at IS NOT NULL), 0)::text AS total_spent_usd
    FROM articles
  `;

    const statsResult = await pool.query<EnrichmentStatsRow>(statsSql);
    const stats = statsResult.rows[0];
    return stats;
}

/**
 * Build an enrichment cost estimate from average observed article costs.
 * Returns zeros when no articles have been enriched yet.
 */
export async function executeCostEstimate(
    pool: pg.Pool,
): Promise<EnrichmentCostEstimateResponse> {
    const guardrails = getEnrichmentGuardrails();
    const pricing = getModelPricing(guardrails.model);
    const stats = await loadEnrichmentStats(pool);
    const articleCount = parseAggregateNumber(stats?.article_count);
    const enrichedCount = parseAggregateNumber(stats?.enriched_count);
    const unenrichedCount = Math.max(articleCount - enrichedCount, 0);
    const totalSpentUsd = parseAggregateNumber(stats?.total_spent_usd);
    const todaySpentUsd = await sumTodayEnrichmentCost(pool);

    let basis: "observed" | "estimated" = "estimated";
    let averagePromptTokens = 0;
    let averageCompletionTokens = 0;
    let costPerArticleUsd = 0;

    if (enrichedCount > 0) {
        basis = "observed";
        averagePromptTokens = parseAggregateNumber(stats?.average_prompt_tokens);
        averageCompletionTokens = parseAggregateNumber(stats?.average_completion_tokens);
        costPerArticleUsd = parseAggregateNumber(stats?.average_cost_usd);
    }

    const response: EnrichmentCostEstimateResponse = {
        model: guardrails.model,
        pricing: {
            prompt_per_million: pricing.promptPerMillion,
            completion_per_million: pricing.completionPerMillion,
        },
        basis,
        article_count: articleCount,
        enriched_count: enrichedCount,
        unenriched_count: unenrichedCount,
        average_prompt_tokens: averagePromptTokens,
        average_completion_tokens: averageCompletionTokens,
        cost_per_article_usd: costPerArticleUsd,
        total_spent_usd: totalSpentUsd,
        today_spent_usd: todaySpentUsd,
        cost_to_enrich_remaining_usd: costPerArticleUsd * unenrichedCount,
        projected_daily_usd_at_50k: costPerArticleUsd * PROJECTED_DAILY_ARTICLES,
        projected_monthly_usd_at_50k: costPerArticleUsd * PROJECTED_DAILY_ARTICLES * DAYS_PER_MONTH,
        guardrails: {
            daily_budget_usd: guardrails.dailyBudgetUsd,
            max_headline_chars: guardrails.maxHeadlineChars,
            max_body_chars: guardrails.maxBodyChars,
            max_output_tokens: guardrails.maxOutputTokens,
            max_retries: guardrails.maxRetries,
        },
    };

    return response;
}
