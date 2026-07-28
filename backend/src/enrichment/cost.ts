"use strict";

/**
 * Per-million-token pricing for the enrichment model.
 */
export interface ModelPricing {
    promptPerMillion: number;
    completionPerMillion: number;
    cachedPromptPerMillion: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
    "qwen/qwen3.6-35b-a3b": {
        promptPerMillion: 0.10,
        completionPerMillion: 1.00,
        cachedPromptPerMillion: 0.05,
    },
};

const DEFAULT_PRICING: ModelPricing = {
    promptPerMillion: 0.10,
    completionPerMillion: 1.00,
    cachedPromptPerMillion: 0.05,
};

/**
 * Parameters for resolving request cost from usage data.
 */
export interface ResolveRequestCostParams {
    model: string;
    promptTokens: number;
    completionTokens: number;
    reportedCostUsd: number | null;
}

/**
 * Resolve the USD cost for an enrichment request.
 */
export function resolveRequestCost(params: ResolveRequestCostParams): number {
    if (params.reportedCostUsd !== null && Number.isFinite(params.reportedCostUsd)) {
        const reported = params.reportedCostUsd;
        return reported;
    }

    const pricing = MODEL_PRICING[params.model] ?? DEFAULT_PRICING;
    const promptCost = (params.promptTokens / 1_000_000) * pricing.promptPerMillion;
    const completionCost = (params.completionTokens / 1_000_000) * pricing.completionPerMillion;
    const totalCost = promptCost + completionCost;

    return totalCost;
}

/**
 * Look up pricing for a model handle.
 */
export function getModelPricing(model: string): ModelPricing {
    const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
    return pricing;
}
