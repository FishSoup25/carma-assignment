"use strict";

import { useCallback, useEffect, useState, type ReactElement } from "react";

import type { Article, ArticleFacetsResponse, PaginationCursor } from "@carma/shared";

import { fetchFacets, searchArticles } from "../api/articles.ts";
import { ApiRequestError } from "../api/client.ts";
import { ArticleList } from "../components/articles/ArticleList.tsx";
import { StatusMessage } from "../components/common/StatusMessage.tsx";
import {
    FilterBar,
} from "../components/filters/FilterBar.tsx";
import {
    createEmptyFilterValues,
    toApiFilters,
    type FilterBarValues,
} from "../components/filters/filterBarTypes.ts";
import { SearchForm } from "../components/search/SearchForm.tsx";
import { useArticleFeed } from "../hooks/useArticleFeed.ts";

/**
 * Boolean search page with query form, filters, and enrichable results.
 */
export function SearchPage(): ReactElement {
    const [query, setQuery] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [filters, setFilters] = useState<FilterBarValues>(createEmptyFilterValues());
    const [facets, setFacets] = useState<ArticleFacetsResponse | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const fetcher = useCallback(async function fetchSearchPage(
        cursor: PaginationCursor | undefined,
    ) {
        if (activeQuery.trim() === "") {
            return {
                items: [] as Article[],
                next_cursor: null,
                has_more: false,
            };
        }

        const result = await searchArticles({
            q: activeQuery,
            ...toApiFilters(filters),
            cursor,
            limit: 10,
        });

        return result;
    }, [activeQuery, filters]);

    const feed = useArticleFeed(fetcher);

    useEffect(function loadFacetsOnMount(): void {
        async function loadFacets(): Promise<void> {
            try {
                const result = await fetchFacets();
                setFacets(result);
            } catch (error) {
                if (error instanceof ApiRequestError) {
                    console.error(error.message);
                }
            }
        }

        void loadFacets();
    }, []);

    useEffect(function reloadWhenActiveQueryChanges(): void {
        if (!hasSearched) {
            return;
        }

        void feed.loadInitial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeQuery, filters, hasSearched]);

    function handleSubmit(): void {
        setHasSearched(true);
        setActiveQuery(query.trim());
    }

    function handleExampleSelect(example: string): void {
        setQuery(example);
        setHasSearched(true);
        setActiveQuery(example);
    }

    return (
        <div className="stack">
            <SearchForm
                query={query}
                isSearching={feed.isLoading}
                onQueryChange={setQuery}
                onSubmit={handleSubmit}
                onExampleSelect={handleExampleSelect}
            />
            <FilterBar
                values={filters}
                facets={facets}
                onChange={setFilters}
            />
            {feed.error !== null ? (
                <StatusMessage variant="error" message={feed.error} />
            ) : null}
            {hasSearched ? (
                <ArticleList
                    items={feed.items}
                    isLoading={feed.isLoading}
                    isLoadingMore={feed.isLoadingMore}
                    hasMore={feed.hasMore}
                    emptyMessage="No articles matched this query."
                    onLoadMore={function handleLoadMore(): void {
                        void feed.loadMore();
                    }}
                    onEnriched={feed.replaceArticle}
                />
            ) : (
                <p className="muted">Enter a boolean query and press Search.</p>
            )}
        </div>
    );
}
