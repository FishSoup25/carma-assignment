"use strict";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

import type { PaginationCursor } from "@carma/shared";

import { listArticles } from "../api/articles.ts";
import { ArticleList } from "../components/articles/ArticleList.tsx";
import { EnrichRemainingPanel } from "../components/articles/EnrichRemainingPanel.tsx";
import { StatusMessage } from "../components/common/StatusMessage.tsx";
import { FilterBar } from "../components/filters/FilterBar.tsx";
import {
    createEmptyFilterValues,
    toApiFilters,
    type FilterBarValues,
} from "../components/filters/filterBarTypes.ts";
import { SeedPanel } from "../components/seed/SeedPanel.tsx";
import { useArticleFeed } from "../hooks/useArticleFeed.ts";
import { useFacets } from "../hooks/useFacets.ts";

const ARTICLES_PAGE_SIZE = 10;

/**
 * Articles browse page with seed button, filters, and enrich actions.
 */
export function ArticlesPage(): ReactElement {
    const [filters, setFilters] = useState<FilterBarValues>(createEmptyFilterValues());
    const facets = useFacets();
    const skipNextFilterReload = useRef(true);

    const fetcher = useCallback(async function fetchArticlePage(
        cursor: PaginationCursor | undefined,
    ) {
        const result = await listArticles({
            ...toApiFilters(filters),
            cursor,
            limit: ARTICLES_PAGE_SIZE,
        });
        return result;
    }, [filters]);

    const feed = useArticleFeed(fetcher);

    useEffect(function loadOnMount(): void {
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

    /**
     * Refresh both the feed and the facets after an action that can add
     * articles or populate new filter values.
     */
    function reloadArticles(): void {
        void facets.reload();
        void feed.loadInitial();
    }

    return (
        <div className="stack">
            <SeedPanel onSeeded={reloadArticles} />
            <EnrichRemainingPanel onCompleted={reloadArticles} />
            <FilterBar
                values={filters}
                facets={facets.facets}
                onChange={setFilters}
            />
            {facets.error !== null ? (
                <StatusMessage variant="error" message={facets.error} />
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
