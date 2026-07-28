"use strict";

import type { ReactElement } from "react";

import type { Sentiment } from "@carma/shared";

interface SentimentBadgeProps {
    sentiment: Sentiment;
}

/**
 * Bordered uppercase sentiment label.
 */
export function SentimentBadge(props: SentimentBadgeProps): ReactElement {
    return <span className="sentiment-badge">{props.sentiment}</span>;
}
