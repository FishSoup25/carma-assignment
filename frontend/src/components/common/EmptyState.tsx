"use strict";

import type { ReactElement } from "react";

interface EmptyStateProps {
    message: string;
}

/**
 * Empty state placeholder when a list has no results.
 */
export function EmptyState(props: EmptyStateProps): ReactElement {
    return (
        <div className="empty-state">
            <p>{props.message}</p>
        </div>
    );
}
