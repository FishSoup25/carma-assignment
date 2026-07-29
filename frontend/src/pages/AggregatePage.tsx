"use strict";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

import type {
    ArticleCountGranularity,
    ArticleCountsResponse,
} from "@carma/shared";

import {
    fetchAggregate,
    type AggregateArticlesParams,
} from "../api/articles.ts";
import { AggregateChart } from "../components/aggregate/AggregateChart.tsx";
import { AggregateTable } from "../components/aggregate/AggregateTable.tsx";
import { GranularityControls } from "../components/aggregate/GranularityControls.tsx";
import { LoadingText } from "../components/common/LoadingText.tsx";
import { StatusMessage } from "../components/common/StatusMessage.tsx";
import { FilterBar } from "../components/filters/FilterBar.tsx";
import {
    createEmptyFilterValues,
    toApiFilters,
    type FilterBarValues,
} from "../components/filters/filterBarTypes.ts";
import { useFacets } from "../hooks/useFacets.ts";

interface AggregateRequestParams {
    granularity: ArticleCountGranularity;
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
    const [granularity, setGranularity] = useState<ArticleCountGranularity>("month");
    const [filters, setFilters] = useState<FilterBarValues>(createEmptyFilterValues());
    const facets = useFacets();
    const [data, setData] = useState<ArticleCountsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const skipNextControlsReload = useRef(true);

    const loadAggregate = useCallback(async function loadAggregateData(
        nextGranularity: ArticleCountGranularity,
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
            const message = caughtError instanceof Error
                ? caughtError.message
                : "Failed to load aggregate data";

            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(function loadOnMount(): void {
        void loadAggregate("month", createEmptyFilterValues());
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
                facets={facets.facets}
                onChange={setFilters}
            />
            {facets.error !== null ? (
                <StatusMessage variant="error" message={facets.error} />
            ) : null}
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
