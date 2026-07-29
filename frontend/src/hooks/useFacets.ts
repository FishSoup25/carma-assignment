"use strict";

import { useCallback, useEffect, useState } from "react";

import type { ArticleFacetsResponse } from "@carma/shared";

import { fetchFacets } from "../api/articles.ts";

interface UseFacetsResult {
    facets: ArticleFacetsResponse | null;
    error: string | null;
    reload: () => Promise<void>;
}

/**
 * Load the distinct filter values used to populate the filter bar dropdowns.
 *
 * Facets are fetched once on mount and can be reloaded after an action that
 * introduces new sources or languages, such as seeding. A failure leaves the
 * dropdowns limited to "All" rather than blocking the page, so the error is
 * returned for the caller to display instead of thrown.
 */
export function useFacets(): UseFacetsResult {
    const [facets, setFacets] = useState<ArticleFacetsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async function reloadFacets(): Promise<void> {
        try {
            const result = await fetchFacets();
            setFacets(result);
            setError(null);
        } catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : "Failed to load filter options";

            setError(message);
        }
    }, []);

    useEffect(function loadFacetsOnMount(): void {
        void reload();
    }, [reload]);

    const result: UseFacetsResult = {
        facets,
        error,
        reload,
    };

    return result;
}
