"use strict";

import type { FormEvent, ReactElement } from "react";

import { QuerySyntaxHelp } from "./QuerySyntaxHelp.tsx";

interface SearchFormProps {
    query: string;
    isSearching: boolean;
    onQueryChange: (value: string) => void;
    onSubmit: () => void;
    onExampleSelect: (value: string) => void;
}

/**
 * Boolean search query form.
 */
export function SearchForm(props: SearchFormProps): ReactElement {
    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        props.onSubmit();
    }

    return (
        <div className="panel">
            <h2>Boolean search</h2>
            <form className="stack" onSubmit={handleSubmit}>
                <div className="field">
                    <label htmlFor="search-query">Query</label>
                    <input
                        id="search-query"
                        type="text"
                        value={props.query}
                        placeholder={"e.g. renewable AND NOT (nuclear OR coal)"}
                        onChange={function handleChange(event): void {
                            props.onQueryChange(event.target.value);
                        }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={props.isSearching || props.query.trim() === ""}
                >
                    {props.isSearching ? "Searching..." : "Search"}
                </button>
            </form>
            <QuerySyntaxHelp onExampleSelect={props.onExampleSelect} />
        </div>
    );
}
