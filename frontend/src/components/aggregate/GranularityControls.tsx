"use strict";

import type { ChangeEvent, ReactElement } from "react";

export type AggregateGranularity = "month" | "week";

interface GranularityControlsProps {
    granularity: AggregateGranularity;
    isLoading: boolean;
    onGranularityChange: (value: AggregateGranularity) => void;
    onRefresh: () => void;
}

/**
 * Aggregate-only control for month/week bucket granularity.
 */
export function GranularityControls(props: GranularityControlsProps): ReactElement {
    return (
        <div className="panel">
            <h2>Granularity</h2>
            <div className="row">
                <div className="field">
                    <label htmlFor="aggregate-granularity">Group by</label>
                    <select
                        id="aggregate-granularity"
                        value={props.granularity}
                        onChange={function handleGranularityChange(
                            event: ChangeEvent<HTMLSelectElement>,
                        ): void {
                            const value = event.target.value;

                            if (value === "month" || value === "week") {
                                props.onGranularityChange(value);
                            }
                        }}
                    >
                        <option value="month">Month</option>
                        <option value="week">Week</option>
                    </select>
                </div>
                <button type="button" onClick={props.onRefresh} disabled={props.isLoading}>
                    {props.isLoading ? "Loading..." : "Refresh"}
                </button>
            </div>
        </div>
    );
}
