"use strict";

import type { ReactElement } from "react";

import type { Article } from "@carma/shared";

import { ActionButton } from "../common/ActionButton.tsx";
import { EmptyState } from "../common/EmptyState.tsx";
import { LoadingText } from "../common/LoadingText.tsx";

import { ArticleCard } from "./ArticleCard.tsx";

interface ArticleListProps {
    items: Article[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    emptyMessage: string;
    onLoadMore: () => void;
    onEnriched: (article: Article) => void;
}

/**
 * List of article cards with optional load-more control.
 */
export function ArticleList(props: ArticleListProps): ReactElement {
    if (props.isLoading) {
        return <LoadingText label="Loading articles..." />;
    }

    if (props.items.length === 0) {
        return <EmptyState message={props.emptyMessage} />;
    }

    return (
        <div className="stack">
            <div className="article-list">
                {props.items.map(function renderArticle(article): ReactElement {
                    return (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            onEnriched={props.onEnriched}
                        />
                    );
                })}
            </div>
            {props.hasMore ? (
                <ActionButton
                    label={props.isLoadingMore ? "Loading more..." : "Load more"}
                    onClick={props.onLoadMore}
                    disabled={props.isLoadingMore}
                />
            ) : null}
        </div>
    );
}
