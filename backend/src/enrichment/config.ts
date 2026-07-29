"use strict";

import { z } from "zod";

import { EnrichmentError } from "./errors.js";

const DEFAULT_MODEL = "qwen/qwen3.6-35b-a3b";
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 2;
const MAX_ALLOWED_RETRIES = 5;
const DEFAULT_MAX_HEADLINE_CHARS = 512;
const DEFAULT_MAX_BODY_CHARS = 8000;
const DEFAULT_MAX_OUTPUT_TOKENS = 400;
const DEFAULT_DAILY_BUDGET_USD = 5;

const guardrailEnvSchema = z.object({
    OPENROUTER_BASE_URL: z.string().url().default(DEFAULT_BASE_URL),
    OPENROUTER_ENRICHMENT_MODEL: z.string().min(1).default(DEFAULT_MODEL),
    OPENROUTER_TIMEOUT_MS: z.coerce.number().int().positive().default(DEFAULT_TIMEOUT_MS),
    OPENROUTER_MAX_RETRIES: z.coerce.number().int().min(0).max(MAX_ALLOWED_RETRIES)
        .default(DEFAULT_MAX_RETRIES),
    LLM_MAX_HEADLINE_CHARS: z.coerce.number().int().positive().default(DEFAULT_MAX_HEADLINE_CHARS),
    LLM_MAX_BODY_CHARS: z.coerce.number().int().positive().default(DEFAULT_MAX_BODY_CHARS),
    LLM_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(DEFAULT_MAX_OUTPUT_TOKENS),
    LLM_DAILY_BUDGET_USD: z.coerce.number().positive().default(DEFAULT_DAILY_BUDGET_USD),
});

/**
 * Model selection and spend guardrails, readable without an API key so the cost
 * estimate endpoint can report them on an unconfigured deployment.
 */
export interface EnrichmentGuardrails {
    baseUrl: string;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    maxHeadlineChars: number;
    maxBodyChars: number;
    maxOutputTokens: number;
    dailyBudgetUsd: number;
}

/**
 * Guardrails plus the credential needed to actually call the provider.
 */
export interface EnrichmentConfig extends EnrichmentGuardrails {
    apiKey: string;
}

let cachedGuardrails: EnrichmentGuardrails | null = null;

/**
 * Load and validate enrichment guardrails from environment variables.
 */
export function getEnrichmentGuardrails(): EnrichmentGuardrails {
    if (cachedGuardrails !== null) {
        return cachedGuardrails;
    }

    const parsedEnv = guardrailEnvSchema.parse({
        OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
        OPENROUTER_ENRICHMENT_MODEL: process.env.OPENROUTER_ENRICHMENT_MODEL,
        OPENROUTER_TIMEOUT_MS: process.env.OPENROUTER_TIMEOUT_MS,
        OPENROUTER_MAX_RETRIES: process.env.OPENROUTER_MAX_RETRIES,
        LLM_MAX_HEADLINE_CHARS: process.env.LLM_MAX_HEADLINE_CHARS,
        LLM_MAX_BODY_CHARS: process.env.LLM_MAX_BODY_CHARS,
        LLM_MAX_OUTPUT_TOKENS: process.env.LLM_MAX_OUTPUT_TOKENS,
        LLM_DAILY_BUDGET_USD: process.env.LLM_DAILY_BUDGET_USD,
    });

    const guardrails: EnrichmentGuardrails = {
        baseUrl: parsedEnv.OPENROUTER_BASE_URL,
        model: parsedEnv.OPENROUTER_ENRICHMENT_MODEL,
        timeoutMs: parsedEnv.OPENROUTER_TIMEOUT_MS,
        maxRetries: parsedEnv.OPENROUTER_MAX_RETRIES,
        maxHeadlineChars: parsedEnv.LLM_MAX_HEADLINE_CHARS,
        maxBodyChars: parsedEnv.LLM_MAX_BODY_CHARS,
        maxOutputTokens: parsedEnv.LLM_MAX_OUTPUT_TOKENS,
        dailyBudgetUsd: parsedEnv.LLM_DAILY_BUDGET_USD,
    };

    cachedGuardrails = guardrails;
    return guardrails;
}

/**
 * Load the full enrichment configuration, requiring an OpenRouter API key.
 */
export function getEnrichmentConfig(): EnrichmentConfig {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey === undefined || apiKey.trim() === "") {
        throw new EnrichmentError(
            "llm_not_configured",
            "OPENROUTER_API_KEY is not configured",
        );
    }

    const config: EnrichmentConfig = {
        ...getEnrichmentGuardrails(),
        apiKey,
    };

    return config;
}

/**
 * Reset cached config, used by tests.
 */
export function resetEnrichmentConfigCache(): void {
    cachedGuardrails = null;
}
