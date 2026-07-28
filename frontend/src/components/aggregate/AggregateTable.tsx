"use strict";

import type { ReactElement } from "react";

import type { ArticleCountBucket } from "@carma/shared";

import { EmptyState } from "../common/EmptyState.tsx";

interface AggregateTableProps {
    buckets: ArticleCountBucket[];
}

/**
 * Format a period start ISO string for table cells.
 */
function formatPeriodLabel(value: string): string {
    const date = new Date(value);
    const formatted = date.toISOString().slice(0, 10);
    return formatted;
}

/**
 * Table view of aggregate count buckets with a total row.
 */
export function AggregateTable(props: AggregateTableProps): ReactElement {
    if (props.buckets.length === 0) {
        return <EmptyState message="No rows to display." />;
    }

    let total = 0;

    for (const bucket of props.buckets) {
        total = total + bucket.count;
    }

    return (
        <div className="panel">
            <h3>Table</h3>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Period start</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {props.buckets.map(function renderRow(bucket): ReactElement {
                        return (
                            <tr key={bucket.period_start}>
                                <td>{formatPeriodLabel(bucket.period_start)}</td>
                                <td>{bucket.count}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr>
                        <td>Total</td>
                        <td>{total}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
