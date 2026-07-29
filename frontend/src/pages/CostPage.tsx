"use strict";

import { useEffect, useState, type ReactElement } from "react";

import type { EnrichmentCostEstimateResponse } from "@carma/shared";

import { fetchCostEstimate } from "../api/enrichment.ts";
import { CostEstimatePanel } from "../components/cost/CostEstimatePanel.tsx";
import { ActionButton } from "../components/common/ActionButton.tsx";
import { LoadingText } from "../components/common/LoadingText.tsx";
import { StatusMessage } from "../components/common/StatusMessage.tsx";

/**
 * Cost estimate page for LLM enrichment pricing projections.
 */
export function CostPage(): ReactElement {
    const [estimate, setEstimate] = useState<EnrichmentCostEstimateResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadEstimate(): Promise<void> {
        setIsLoading(true);
        setError(null);

        try {
            const result = await fetchCostEstimate();
            setEstimate(result);
        } catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : "Failed to load cost estimate";

            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(function loadOnMount(): void {
        void loadEstimate();
    }, []);

    return (
        <div className="stack">
            <div className="row">
                <ActionButton
                    label={isLoading ? "Refreshing..." : "Refresh estimate"}
                    onClick={function handleRefresh(): void {
                        void loadEstimate();
                    }}
                    disabled={isLoading}
                />
            </div>
            {error !== null ? (
                <StatusMessage variant="error" message={error} />
            ) : null}
            {isLoading && estimate === null ? (
                <LoadingText label="Loading cost estimate..." />
            ) : null}
            {estimate !== null ? (
                <CostEstimatePanel estimate={estimate} />
            ) : null}
        </div>
    );
}
