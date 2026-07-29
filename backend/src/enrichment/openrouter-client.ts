"use strict";

import { z } from "zod";

import { getEnrichmentConfig } from "./config.js";
import { EnrichmentError } from "./errors.js";
import { parseEnrichmentResponse } from "./parse-enrichment-response.js";
import { buildEnrichmentResponseFormat } from "./response-schema.js";
import type { ChatMessage } from "./types.js";

const openRouterUsageSchema = z.object({
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
});

const openRouterResponseSchema = z.object({
    choices: z.array(z.object({
        message: z.object({
            content: z.string().nullable(),
        }),
    })).min(1),
    usage: openRouterUsageSchema.optional(),
});

/**
 * Result of a successful OpenRouter enrichment completion.
 */
export interface EnrichmentCompletionResult {
    content: string;
    promptTokens: number;
    completionTokens: number;
    reportedCostUsd: number | null;
}

/**
 * Parameters for requesting an enrichment completion from OpenRouter.
 */
export interface RequestEnrichmentCompletionParams {
    messages: ChatMessage[];
}

/**
 * Sleep for a given number of milliseconds.
 */
async function sleep(milliseconds: number): Promise<void> {
    await new Promise(function resolveSleep(resolve): void {
        setTimeout(resolve, milliseconds);
    });
}

/**
 * Determine whether an HTTP status code is retryable.
 */
function isRetryableStatus(statusCode: number): boolean {
    if (statusCode === 429) {
        return true;
    }

    if (statusCode >= 500) {
        return true;
    }

    return false;
}

/**
 * Build request headers for OpenRouter API calls.
 */
function buildRequestHeaders(config: ReturnType<typeof getEnrichmentConfig>): Record<string, string> {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
    };

    return headers;
}

/**
 * Execute a single OpenRouter chat completion request.
 */
async function executeCompletionRequest(
    config: ReturnType<typeof getEnrichmentConfig>,
    messages: ChatMessage[],
): Promise<Response> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(function onTimeout(): void {
        controller.abort();
    }, config.timeoutMs);

    try {
        const requestBody = {
            model: config.model,
            messages,
            max_tokens: config.maxOutputTokens,
            temperature: 0.2,
            reasoning: { enabled: false },
            usage: { include: true },
            // require_parameters keeps routing to providers that honour the
            // structured-output schema; sorting by price then pins the cheapest
            // of those, so billed cost matches the pricing table in cost.ts
            // instead of drifting across the provider range.
            provider: { require_parameters: true, sort: "price" },
            response_format: buildEnrichmentResponseFormat(),
        };

        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: buildRequestHeaders(config),
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        return response;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new EnrichmentError(
                "llm_timeout",
                `OpenRouter request timed out after ${config.timeoutMs}ms`,
            );
        }

        const message = error instanceof Error ? error.message : "Unknown fetch error";

        throw new EnrichmentError(
            "llm_request_failed",
            `OpenRouter request failed: ${message}`,
        );
    } finally {
        clearTimeout(timeoutHandle);
    }
}

/**
 * Parse and validate an OpenRouter chat completion response body.
 */
function parseCompletionResponseBody(responseBody: Record<string, unknown>): EnrichmentCompletionResult {
    const parsedBody = openRouterResponseSchema.safeParse(responseBody);

    if (!parsedBody.success) {
        throw new EnrichmentError(
            "llm_request_failed",
            "OpenRouter response has an unexpected shape",
        );
    }

    const content = parsedBody.data.choices[0]?.message.content;

    if (content === null || content === undefined || content.trim().length === 0) {
        throw new EnrichmentError(
            "llm_request_failed",
            "OpenRouter response did not include message content",
        );
    }

    const usage = parsedBody.data.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    let reportedCostUsd: number | null = null;

    if (usage?.cost !== undefined) {
        reportedCostUsd = usage.cost;
    }

    parseEnrichmentResponse(content);

    const result: EnrichmentCompletionResult = {
        content,
        promptTokens,
        completionTokens,
        reportedCostUsd,
    };

    return result;
}

/**
 * Extract an error message from an OpenRouter error response body.
 */
function extractOpenRouterErrorMessage(errorBody: Record<string, unknown>): string | null {
    const errorValue = errorBody.error;

    if (
        typeof errorValue === "object"
        && errorValue !== null
        && "message" in errorValue
        && typeof errorValue.message === "string"
    ) {
        return errorValue.message;
    }

    return null;
}

/**
 * Compute exponential backoff delay for retry attempts.
 */
function computeBackoffMs(attempt: number): number {
    const backoffMs = Math.pow(2, attempt) * 500;
    return backoffMs;
}

/**
 * Handle a failed OpenRouter response, retrying when appropriate.
 */
async function handleFailedResponse(
    response: Response,
    attempt: number,
    maxRetries: number,
): Promise<number> {
    if (response.status === 429 && attempt < maxRetries) {
        await sleep(computeBackoffMs(attempt));
        return attempt + 1;
    }

    if (response.status === 429) {
        throw new EnrichmentError(
            "llm_rate_limited",
            "OpenRouter rate limit exceeded after retries",
        );
    }

    if (isRetryableStatus(response.status) && attempt < maxRetries) {
        await sleep(computeBackoffMs(attempt));
        return attempt + 1;
    }

    let errorMessage = `OpenRouter request failed with status ${response.status}`;

    try {
        const errorBody = await response.json() as Record<string, unknown>;
        const extractedMessage = extractOpenRouterErrorMessage(errorBody);

        if (extractedMessage !== null) {
            errorMessage = extractedMessage;
        }
    } catch {
        // Ignore JSON parse failures for error bodies.
    }

    throw new EnrichmentError(
        "llm_request_failed",
        errorMessage,
    );
}

/**
 * Request an enrichment completion from OpenRouter with bounded retries.
 */
export async function requestEnrichmentCompletion(
    params: RequestEnrichmentCompletionParams,
): Promise<EnrichmentCompletionResult> {
    const config = getEnrichmentConfig();
    let attempt = 0;

    while (attempt <= config.maxRetries) {
        const response = await executeCompletionRequest(config, params.messages);

        if (response.ok) {
            const responseBody = await response.json() as Record<string, unknown>;
            const result = parseCompletionResponseBody(responseBody);
            return result;
        }

        attempt = await handleFailedResponse(response, attempt, config.maxRetries);
    }

    throw new EnrichmentError(
        "llm_request_failed",
        "OpenRouter request failed after retries",
    );
}

/**
 * Parse raw completion content without calling the network.
 */
export function parseCompletionContent(rawContent: string): EnrichmentCompletionResult {
    parseEnrichmentResponse(rawContent);

    const result: EnrichmentCompletionResult = {
        content: rawContent,
        promptTokens: 0,
        completionTokens: 0,
        reportedCostUsd: null,
    };

    return result;
}
