"use strict";

import type { ReactElement } from "react";

interface TopicTagsProps {
    tags: string[];
}

/**
 * List of topic tag badges.
 */
export function TopicTags(props: TopicTagsProps): ReactElement {
    return (
        <div className="topic-tags">
            {props.tags.map(function renderTag(tag): ReactElement {
                return (
                    <span key={tag} className="topic-tag">
                        {tag}
                    </span>
                );
            })}
        </div>
    );
}
