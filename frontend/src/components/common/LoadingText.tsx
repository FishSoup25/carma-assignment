"use strict";

import type { ReactElement } from "react";

interface LoadingTextProps {
    label: string;
}

/**
 * Simple loading indicator text.
 */
export function LoadingText(props: LoadingTextProps): ReactElement {
    return <p className="loading-text">{props.label}</p>;
}
