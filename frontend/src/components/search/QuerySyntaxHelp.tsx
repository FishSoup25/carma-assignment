"use strict";

import type { ReactElement } from "react";

const EXAMPLE_QUERIES = [
    '"oil prices" AND (geopolitical OR "supply chain")',
    "renewable AND NOT (nuclear OR coal)",
    'AI AND ("healthcare" OR "diagnostic") AND NOT startup*',
];

interface QuerySyntaxHelpProps {
    onExampleSelect: (value: string) => void;
}

/**
 * Short boolean query syntax help with clickable examples.
 */
export function QuerySyntaxHelp(props: QuerySyntaxHelpProps): ReactElement {
    return (
        <div className="syntax-help">
            <h3>Syntax</h3>
            <ul>
                <li>Operators: AND, OR, NOT (case-sensitive)</li>
                <li>Phrases: &quot;oil prices&quot;</li>
                <li>Wildcards: renew* (trailing only)</li>
                <li>Nesting: (a AND (b OR c))</li>
            </ul>
            <h3>Examples</h3>
            {EXAMPLE_QUERIES.map(function renderExample(example): ReactElement {
                return (
                    <button
                        key={example}
                        type="button"
                        className="example-query"
                        onClick={function handleExampleClick(): void {
                            props.onExampleSelect(example);
                        }}
                    >
                        {example}
                    </button>
                );
            })}
        </div>
    );
}
