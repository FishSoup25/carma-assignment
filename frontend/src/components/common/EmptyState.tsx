"use strict";

import type { ReactElement, ReactNode } from "react";

interface EmptyStateProps {
    message: string;
    children?: ReactNode;
}

/**
 * Empty state placeholder when a list has no results.
 */
export function EmptyState(props: EmptyStateProps): ReactElement {
    return (
        <div className="empty-state">
            <p>{props.message}</p>
            {props.children}
        </div>
    );
}
