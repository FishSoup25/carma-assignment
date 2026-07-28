"use strict";

import type { ReactElement } from "react";

interface ActionButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    type?: "button" | "submit";
}

/**
 * Plain bordered action button used throughout the wireframe UI.
 */
export function ActionButton(props: ActionButtonProps): ReactElement {
    const buttonType = props.type ?? "button";
    const isDisabled = props.disabled === true;

    return (
        <button type={buttonType} onClick={props.onClick} disabled={isDisabled}>
            {props.label}
        </button>
    );
}
