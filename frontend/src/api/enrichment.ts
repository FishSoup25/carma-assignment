"use strict";

import type { EnrichmentCostEstimateResponse } from "@carma/shared";

import { fetchJson } from "./client.ts";

/**
 * Fetch the LLM enrichment cost estimate.
 */
export async function fetchCostEstimate(): Promise<EnrichmentCostEstimateResponse> {
    const result = await fetchJson<EnrichmentCostEstimateResponse>({
        path: "/api/enrichment/cost-estimate",
    });

    return result;
}
