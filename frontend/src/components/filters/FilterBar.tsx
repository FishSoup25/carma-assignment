"use strict";

import type { ChangeEvent, ReactElement } from "react";

import type { FilterBarProps } from "./filterBarTypes.ts";

/**
 * Shared filter controls for article browse and search pages.
 */
export function FilterBar(props: FilterBarProps): ReactElement {
    const sources = props.facets?.sources ?? [];
    const languages = props.facets?.languages ?? [];

    function updateField(
        field: keyof FilterBarProps["values"],
        value: string,
    ): void {
        props.onChange({
            ...props.values,
            [field]: value,
        });
    }

    return (
        <div className="panel">
            <h3>Filters</h3>
            <div className="row">
                <div className="field">
                    <label htmlFor="filter-source">Source</label>
                    <select
                        id="filter-source"
                        value={props.values.source}
                        onChange={function handleSourceChange(event: ChangeEvent<HTMLSelectElement>): void {
                            updateField("source", event.target.value);
                        }}
                    >
                        <option value="">All sources</option>
                        {sources.map(function renderSource(source): ReactElement {
                            return (
                                <option key={source} value={source}>
                                    {source}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="field">
                    <label htmlFor="filter-language">Language</label>
                    <select
                        id="filter-language"
                        value={props.values.language}
                        onChange={function handleLanguageChange(event: ChangeEvent<HTMLSelectElement>): void {
                            updateField("language", event.target.value);
                        }}
                    >
                        <option value="">All languages</option>
                        {languages.map(function renderLanguage(language): ReactElement {
                            return (
                                <option key={language} value={language}>
                                    {language}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="field">
                    <label htmlFor="filter-sentiment">Sentiment</label>
                    <select
                        id="filter-sentiment"
                        value={props.values.sentiment}
                        onChange={function handleSentimentChange(event: ChangeEvent<HTMLSelectElement>): void {
                            updateField("sentiment", event.target.value);
                        }}
                    >
                        <option value="">All sentiments</option>
                        <option value="positive">positive</option>
                        <option value="negative">negative</option>
                        <option value="neutral">neutral</option>
                        <option value="mixed">mixed</option>
                    </select>
                </div>

                <div className="field">
                    <label htmlFor="filter-enriched">Enriched</label>
                    <select
                        id="filter-enriched"
                        value={props.values.enriched}
                        onChange={function handleEnrichedChange(event: ChangeEvent<HTMLSelectElement>): void {
                            updateField("enriched", event.target.value);
                        }}
                    >
                        <option value="">All</option>
                        <option value="true">Enriched only</option>
                        <option value="false">Not enriched</option>
                    </select>
                </div>

                <div className="field">
                    <label htmlFor="filter-date-from">From</label>
                    <input
                        id="filter-date-from"
                        type="date"
                        value={props.values.date_from}
                        onChange={function handleDateFromChange(event: ChangeEvent<HTMLInputElement>): void {
                            updateField("date_from", event.target.value);
                        }}
                    />
                </div>

                <div className="field">
                    <label htmlFor="filter-date-to">To</label>
                    <input
                        id="filter-date-to"
                        type="date"
                        value={props.values.date_to}
                        onChange={function handleDateToChange(event: ChangeEvent<HTMLInputElement>): void {
                            updateField("date_to", event.target.value);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
