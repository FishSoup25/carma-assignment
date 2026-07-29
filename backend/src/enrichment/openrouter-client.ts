"use strict";

import { z } from "zod";

import { getEnrichmentConfig, type EnrichmentConfig } from "./config.js";
import { EnrichmentError } from "./errors.js";
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

const openRouterErrorSchema = z.object({
    error: z.object({
        message: z.string().min(1),
    }),
});

/**
 * Transport-level result of an OpenRouter completion. The message content is
 * still raw model output; the enrichment service validates it against the
 * response schema.
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
function buildRequestHeaders(config: EnrichmentConfig): Record<string, string> {
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
    config: EnrichmentConfig,
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
 * Read the completion envelope from a successful OpenRouter response.
 */
async function readCompletionResponse(response: Response): Promise<EnrichmentCompletionResult> {
    const parsedBody = openRouterResponseSchema.safeParse(await response.json());

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

    const result: EnrichmentCompletionResult = {
        content,
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        reportedCostUsd: usage?.cost ?? null,
    };

    return result;
}

/**
 * Read the provider-supplied message from an OpenRouter error response, falling
 * back to null when the body is missing, non-JSON, or shaped unexpectedly.
 */
async function readOpenRouterErrorMessage(response: Response): Promise<string | null> {
    try {
        const parsedBody = openRouterErrorSchema.safeParse(await response.json());

        if (parsedBody.success) {
            return parsedBody.data.error.message;
        }

        return null;
    } catch {
        return null;
    }
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

    const providerMessage = await readOpenRouterErrorMessage(response);
    const errorMessage = providerMessage
        ?? `OpenRouter request failed with status ${response.status}`;

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
            const result = await readCompletionResponse(response);
            return result;
        }

        attempt = await handleFailedResponse(response, attempt, config.maxRetries);
    }

    throw new EnrichmentError(
        "llm_request_failed",
        "OpenRouter request failed after retries",
    );
}
