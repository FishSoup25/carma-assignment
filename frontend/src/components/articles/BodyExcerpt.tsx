"use strict";

import { useState, type ReactElement } from "react";

const EXCERPT_LENGTH = 280;

interface BodyExcerptProps {
    body: string | null;
}

/**
 * Escaped body excerpt with expand/collapse toggle.
 */
export function BodyExcerpt(props: BodyExcerptProps): ReactElement {
    const [isExpanded, setIsExpanded] = useState(false);
    const body = props.body ?? "";

    if (body.trim() === "") {
        return <p className="body-excerpt muted">(no body)</p>;
    }

    const needsTruncation = body.length > EXCERPT_LENGTH;
    let displayText = body;

    if (needsTruncation && !isExpanded) {
        displayText = `${body.slice(0, EXCERPT_LENGTH)}...`;
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
