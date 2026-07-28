"use strict";

import { z } from "zod";

import { EnrichmentError } from "./errors.js";

const enrichmentEnvSchema = z.object({
    OPENROUTER_API_KEY: z.string().min(1),
    OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
    OPENROUTER_ENRICHMENT_MODEL: z.string().min(1).default("qwen/qwen3.6-35b-a3b"),
    OPENROUTER_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    OPENROUTER_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    LLM_MAX_HEADLINE_CHARS: z.coerce.number().int().positive().default(512),
    LLM_MAX_BODY_CHARS: z.coerce.number().int().positive().default(8000),
    LLM_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(400),
    LLM_DAILY_BUDGET_USD: z.coerce.number().positive().default(5),
});

/**
 * Validated enrichment configuration loaded from environment variables.
 */
export interface EnrichmentConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    maxHeadlineChars: number;
    maxBodyChars: number;
    maxOutputTokens: number;
    dailyBudgetUsd: number;
}

let cachedConfig: EnrichmentConfig | null = null;

/**
 * Load and validate enrichment configuration from environment variables.
 */
export function getEnrichmentConfig(): EnrichmentConfig {
    if (cachedConfig !== null) {
        return cachedConfig;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey === undefined || apiKey.trim() === "") {
        throw new EnrichmentError(
            "llm_not_configured",
            "OPENROUTER_API_KEY is not configured",
        );
    }

    const parsedEnv = enrichmentEnvSchema.parse({
        OPENROUTER_API_KEY: apiKey,
        OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
        OPENROUTER_ENRICHMENT_MODEL: process.env.OPENROUTER_ENRICHMENT_MODEL,
        OPENROUTER_TIMEOUT_MS: process.env.OPENROUTER_TIMEOUT_MS,
        OPENROUTER_MAX_RETRIES: process.env.OPENROUTER_MAX_RETRIES,
        LLM_MAX_HEADLINE_CHARS: process.env.LLM_MAX_HEADLINE_CHARS,
        LLM_MAX_BODY_CHARS: process.env.LLM_MAX_BODY_CHARS,
        LLM_MAX_OUTPUT_TOKENS: process.env.LLM_MAX_OUTPUT_TOKENS,
        LLM_DAILY_BUDGET_USD: process.env.LLM_DAILY_BUDGET_USD,
    });

    const config: EnrichmentConfig = {
        apiKey: parsedEnv.OPENROUTER_API_KEY,
        baseUrl: parsedEnv.OPENROUTER_BASE_URL,
        model: parsedEnv.OPENROUTER_ENRICHMENT_MODEL,
        timeoutMs: parsedEnv.OPENROUTER_TIMEOUT_MS,
        maxRetries: parsedEnv.OPENROUTER_MAX_RETRIES,
        maxHeadlineChars: parsedEnv.LLM_MAX_HEADLINE_CHARS,
        maxBodyChars: parsedEnv.LLM_MAX_BODY_CHARS,
        maxOutputTokens: parsedEnv.LLM_MAX_OUTPUT_TOKENS,
        dailyBudgetUsd: parsedEnv.LLM_DAILY_BUDGET_USD,
    };

    cachedConfig = config;
    return config;
}

/**
 * Reset cached config, used by tests.
 */
export function resetEnrichmentConfigCache(): void {
    cachedConfig = null;
}
