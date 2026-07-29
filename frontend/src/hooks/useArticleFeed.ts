"use strict";

import { useCallback, useState } from "react";

import type { Article, PaginatedArticlesResponse, PaginationCursor } from "@carma/shared";

interface UseArticleFeedResult {
    items: Article[];
    hasMore: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
    loadInitial: () => Promise<void>;
    loadMore: () => Promise<void>;
    replaceArticle: (article: Article) => void;
    reset: () => void;
}

/**
 * Shared feed state for list and search pages with keyset pagination.
 */
export function useArticleFeed(
    fetcher: (cursor: PaginationCursor | undefined) => Promise<PaginatedArticlesResponse>,
): UseArticleFeedResult {
    const [items, setItems] = useState<Article[]>([]);
    const [nextCursor, setNextCursor] = useState<PaginationCursor | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(function resetFeed(): void {
        setItems([]);
        setNextCursor(null);
        setHasMore(false);
        setIsLoading(false);
        setIsLoadingMore(false);
        setError(null);
    }, []);

    const loadInitial = useCallback(async function loadInitialFeed(): Promise<void> {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetcher(undefined);
            setItems(response.items);
            setNextCursor(response.next_cursor);
            setHasMore(response.has_more);
        } catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : "Failed to load articles";

            setItems([]);
            setNextCursor(null);
            setHasMore(false);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [fetcher]);

    const loadMore = useCallback(async function loadMoreFeed(): Promise<void> {
        if (nextCursor === null || isLoadingMore) {
            return;
        }

        setIsLoadingMore(true);
        setError(null);

        try {
            const response = await fetcher(nextCursor);
            setItems(function appendItems(previousItems): Article[] {
                const combined: Article[] = [...previousItems];

                for (const item of response.items) {
                    combined.push(item);
                }

                return combined;
            });
            setNextCursor(response.next_cursor);
            setHasMore(response.has_more);
        } catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : "Failed to load more articles";

            setError(message);
        } finally {
            setIsLoadingMore(false);
        }
    }, [fetcher, isLoadingMore, nextCursor]);

    const replaceArticle = useCallback(function replaceFeedArticle(article: Article): void {
        setItems(function updateItems(previousItems): Article[] {
            const updated: Article[] = [];

            for (const item of previousItems) {
                if (item.id === article.id) {
                    updated.push(article);
                } else {
                    updated.push(item);
                }
            }

            return updated;
        });
    }, []);

    const result: UseArticleFeedResult = {
        items,
        hasMore,
        isLoading,
        isLoadingMore,
        error,
        loadInitial,
        loadMore,
        replaceArticle,
        reset,
    };

    return result;
}
