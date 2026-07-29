"use strict";

import type { ArticleFacetsResponse, Sentiment } from "@carma/shared";

import { toApiDateFrom, toApiDateTo } from "../../utils/dateRange.ts";

export interface FilterBarValues {
    source: string;
    language: string;
    sentiment: "" | Sentiment;
    enriched: "" | "true" | "false";
    date_from: string;
    date_to: string;
}

/**
 * Filter fields in the shape the article API expects, with unset
 * controls omitted rather than sent as empty strings.
 */
export interface ApiFilterParams {
    source?: string;
    language?: string;
    sentiment?: Sentiment;
    enriched?: "true" | "false";
    date_from?: string;
    date_to?: string;
}

/**
 * Convert filter bar values into article API query parameters.
 * Shared by the articles, search, and aggregate pages so that a filter added
 * to the bar reaches every endpoint instead of being silently dropped.
 */
export function toApiFilters(values: FilterBarValues): ApiFilterParams {
    const params: ApiFilterParams = {};

    if (values.source !== "") {
        params.source = values.source;
    }

    if (values.language !== "") {
        params.language = values.language;
    }

    if (values.sentiment !== "") {
        params.sentiment = values.sentiment;
    }

    if (values.enriched !== "") {
        params.enriched = values.enriched;
    }

    if (values.date_from !== "") {
        params.date_from = toApiDateFrom(values.date_from);
    }

    if (values.date_to !== "") {
        params.date_to = toApiDateTo(values.date_to);
    }

    return params;
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
