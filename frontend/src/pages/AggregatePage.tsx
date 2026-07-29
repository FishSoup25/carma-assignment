"use strict";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

import type { ArticleCountsResponse, ArticleFacetsResponse } from "@carma/shared";

import {
    fetchAggregate,
    fetchFacets,
    type AggregateArticlesParams,
} from "../api/articles.ts";
import { ApiRequestError } from "../api/client.ts";
import { AggregateChart } from "../components/aggregate/AggregateChart.tsx";
import { AggregateTable } from "../components/aggregate/AggregateTable.tsx";
import {
    GranularityControls,
    type AggregateGranularity,
} from "../components/aggregate/GranularityControls.tsx";
import { LoadingText } from "../components/common/LoadingText.tsx";
import { StatusMessage } from "../components/common/StatusMessage.tsx";
import { FilterBar } from "../components/filters/FilterBar.tsx";
import {
    createEmptyFilterValues,
    toApiFilters,
    type FilterBarValues,
} from "../components/filters/filterBarTypes.ts";

interface AggregateRequestParams {
    granularity: AggregateGranularity;
    filters: FilterBarValues;
}

/**
 * Build aggregate API params from granularity and shared filter values.
 */
function toAggregateParams(params: AggregateRequestParams): AggregateArticlesParams {
    const query: AggregateArticlesParams = {
        granularity: params.granularity,
        ...toApiFilters(params.filters),
    };

    return query;
}

/**
 * Aggregate dashboard page with shared filters, chart, and table.
 */
export function AggregatePage(): ReactElement {
    const [granularity, setGranularity] = useState<AggregateGranularity>("month");
    const [filters, setFilters] = useState<FilterBarValues>(createEmptyFilterValues());
    const [facets, setFacets] = useState<ArticleFacetsResponse | null>(null);
    const [data, setData] = useState<ArticleCountsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const skipNextControlsReload = useRef(true);

    const loadAggregate = useCallback(async function loadAggregateData(
        nextGranularity: AggregateGranularity,
        nextFilters: FilterBarValues,
    ): Promise<void> {
        setIsLoading(true);
        setError(null);

        try {
            const result = await fetchAggregate(toAggregateParams({
                granularity: nextGranularity,
                filters: nextFilters,
            }));
            setData(result);
        } catch (caughtError) {
            let message = "Failed to load aggregate data";

            if (caughtError instanceof ApiRequestError) {
                message = caughtError.message;
            } else if (caughtError instanceof Error) {
                message = caughtError.message;
            }

            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(function loadOnMount(): void {
        async function initialize(): Promise<void> {
            try {
                const facetsResult = await fetchFacets();
                setFacets(facetsResult);
            } catch (caughtError) {
                if (caughtError instanceof ApiRequestError) {
                    console.error(caughtError.message);
                }
            }

            await loadAggregate("month", createEmptyFilterValues());
        }

        void initialize();
    }, [loadAggregate]);

    useEffect(function reloadOnControlsChange(): void {
        if (skipNextControlsReload.current) {
            skipNextControlsReload.current = false;
            return;
        }

        void loadAggregate(granularity, filters);
    }, [filters, granularity, loadAggregate]);

    return (
        <div className="stack">
            <GranularityControls
                granularity={granularity}
                isLoading={isLoading}
                onGranularityChange={setGranularity}
                onRefresh={function handleRefresh(): void {
                    void loadAggregate(granularity, filters);
                }}
            />
            <FilterBar
                values={filters}
                facets={facets}
                onChange={setFilters}
            />
            {error !== null ? (
                <StatusMessage variant="error" message={error} />
            ) : null}
            {isLoading && data === null ? (
                <LoadingText label="Loading aggregate counts..." />
            ) : null}
            {data !== null ? (
                <>
                    <p className="muted">
                        Granularity: {data.granularity} · Buckets: {data.buckets.length}
                    </p>
                    <AggregateChart buckets={data.buckets} />
                    <AggregateTable buckets={data.buckets} />
                </>
            ) : null}
        </div>
    );
}
