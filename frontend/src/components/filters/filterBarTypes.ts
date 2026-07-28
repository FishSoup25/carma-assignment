"use strict";

import type { ArticleFacetsResponse, Sentiment } from "@carma/shared";

export interface FilterBarValues {
    source: string;
    language: string;
    sentiment: "" | Sentiment;
    enriched: "" | "true" | "false";
    date_from: string;
    date_to: string;
}

/**
 * Create empty filter bar values.
 */
export function createEmptyFilterValues(): FilterBarValues {
    const values: FilterBarValues = {
        source: "",
        language: "",
        sentiment: "",
        enriched: "",
        date_from: "",
        date_to: "",
    };

    return values;
}

export interface FilterBarProps {
    values: FilterBarValues;
    facets: ArticleFacetsResponse | null;
    showEnrichedFilter?: boolean;
    onChange: (values: FilterBarValues) => void;
}
