"use strict";

import type { ReactElement } from "react";

/**
 * Simple loading indicator text.
 */
export function LoadingText(props: { label?: string }): ReactElement {
    const label = props.label ?? "Loading...";
    return <p className="loading-text">{label}</p>;
}
