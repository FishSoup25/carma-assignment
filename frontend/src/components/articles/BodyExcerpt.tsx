"use strict";

import { useState, type ReactElement } from "react";

const DEFAULT_EXCERPT_LENGTH = 280;

interface BodyExcerptProps {
    body: string | null;
    maxLength?: number;
}

/**
 * Escaped body excerpt with expand/collapse toggle.
 */
export function BodyExcerpt(props: BodyExcerptProps): ReactElement {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxLength = props.maxLength ?? DEFAULT_EXCERPT_LENGTH;
    const body = props.body ?? "";

    if (body.trim() === "") {
        return <p className="body-excerpt muted">(no body)</p>;
    }

    const needsTruncation = body.length > maxLength;
    let displayText = body;

    if (needsTruncation && !isExpanded) {
        displayText = `${body.slice(0, maxLength)}...`;
    }

    return (
        <div>
            <p className="body-excerpt" dir="auto">
                {displayText}
            </p>
            {needsTruncation ? (
                <button
                    type="button"
                    onClick={function handleToggle(): void {
                        setIsExpanded(!isExpanded);
                    }}
                >
                    {isExpanded ? "Show less" : "Show more"}
                </button>
            ) : null}
        </div>
    );
}
