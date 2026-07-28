"use strict";

import type { ReactElement } from "react";

interface StatusMessageProps {
    message: string;
    variant?: "error" | "success" | "info";
}

/**
 * Inline status banner for success and error messages.
 */
export function StatusMessage(props: StatusMessageProps): ReactElement {
    const variant = props.variant ?? "info";
    const className = `status-message ${variant}`;

    return <div className={className}>{props.message}</div>;
}
