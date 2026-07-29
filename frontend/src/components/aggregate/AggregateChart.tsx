"use strict";

import type { ReactElement } from "react";

import type { ArticleCountBucket } from "@carma/shared";

import { formatIsoDate } from "../../utils/format.ts";

import { EmptyState } from "../common/EmptyState.tsx";

interface AggregateChartProps {
    buckets: ArticleCountBucket[];
}

/**
 * Pure CSS horizontal bar chart for aggregate counts.
 */
export function AggregateChart(props: AggregateChartProps): ReactElement {
    if (props.buckets.length === 0) {
        return <EmptyState message="No aggregate buckets for the current filters." />;
    }

    let maxCount = 1;

    for (const bucket of props.buckets) {
        if (bucket.count > maxCount) {
            maxCount = bucket.count;
        }
    }

    return (
        <div className="panel">
            <h3>Chart</h3>
            <div className="chart-rows">
                {props.buckets.map(function renderBucket(bucket): ReactElement {
                    const percent = Math.max((bucket.count / maxCount) * 100, 1);

                    return (
                        <div key={bucket.period_start} className="chart-row">
                            <span>{formatIsoDate(bucket.period_start)}</span>
                            <div className="chart-bar-track">
                                <div
                                    className="chart-bar-fill"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <span>{bucket.count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
