"use strict";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

import type { ArticleFacetsResponse, PaginationCursor } from "@carma/shared";

import { listArticles, fetchFacets } from "../api/articles.ts";
import { ApiRequestError } from "../api/client.ts";
import { ArticleList } from "../components/articles/ArticleList.tsx";
import { EnrichRemainingPanel } from "../components/articles/EnrichRemainingPanel.tsx";
import { StatusMessage } from "../components/common/StatusMessage.tsx";
import {
    FilterBar,
} from "../components/filters/FilterBar.tsx";
import {
    createEmptyFilterValues,
    toApiFilters,
    type FilterBarValues,
} from "../components/filters/filterBarTypes.ts";
import { SeedPanel } from "../components/seed/SeedPanel.tsx";
import { useArticleFeed } from "../hooks/useArticleFeed.ts";

/**
 * Articles browse page with seed button, filters, and enrich actions.
 */
export function ArticlesPage(): ReactElement {
    const [filters, setFilters] = useState<FilterBarValues>(createEmptyFilterValues());
    const [facets, setFacets] = useState<ArticleFacetsResponse | null>(null);
    const [facetsError, setFacetsError] = useState<string | null>(null);
    const skipNextFilterReload = useRef(true);

    const fetcher = useCallback(async function fetchArticlePage(
        cursor: PaginationCursor | undefined,
    ) {
        const result = await listArticles({
            ...toApiFilters(filters),
            cursor,
            limit: 10,
        });
        return result;
    }, [filters]);

    const feed = useArticleFeed(fetcher);

    const loadFacets = useCallback(async function loadArticleFacets(): Promise<void> {
        try {
            const result = await fetchFacets();
            setFacets(result);
            setFacetsError(null);
        } catch (error) {
            let message = "Failed to load filter options";

            if (error instanceof ApiRequestError) {
                message = error.message;
            } else if (error instanceof Error) {
                message = error.message;
            }

            setFacetsError(message);
        }
    }, []);

    useEffect(function loadOnMount(): void {
        void loadFacets();
        void feed.loadInitial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(function reloadOnFilterChange(): void {
        if (skipNextFilterReload.current) {
            skipNextFilterReload.current = false;
            return;
        }

        void feed.loadInitial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    function handleSeeded(): void {
        void loadFacets();
        void feed.loadInitial();
    }

    function handleBatchEnrichCompleted(): void {
        void loadFacets();
        void feed.loadInitial();
    }

    return (
        <div className="stack">
            <SeedPanel onSeeded={handleSeeded} />
            <EnrichRemainingPanel onCompleted={handleBatchEnrichCompleted} />
            <FilterBar
                values={filters}
                facets={facets}
                onChange={setFilters}
            />
            {facetsError !== null ? (
                <StatusMessage variant="error" message={facetsError} />
            ) : null}
            {feed.error !== null ? (
                <StatusMessage variant="error" message={feed.error} />
            ) : null}
            <ArticleList
                items={feed.items}
                isLoading={feed.isLoading}
                isLoadingMore={feed.isLoadingMore}
                hasMore={feed.hasMore}
                emptyMessage="No articles found. Run the seed script to load sample data."
                onLoadMore={function handleLoadMore(): void {
                    void feed.loadMore();
                }}
                onEnriched={feed.replaceArticle}
            />
        </div>
    );
}
