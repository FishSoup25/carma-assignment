"use strict";

import type { ReactElement } from "react";

interface ActionButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

/**
 * Plain bordered action button used throughout the wireframe UI.
 */
export function ActionButton(props: ActionButtonProps): ReactElement {
    const isDisabled = props.disabled === true;

    return (
        <button type="button" onClick={props.onClick} disabled={isDisabled}>
            {props.label}
        </button>
    );
}
