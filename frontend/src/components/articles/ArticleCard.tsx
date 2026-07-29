"use strict";

import type { ReactElement } from "react";

import type { Article } from "@carma/shared";

import { isArticleEnriched } from "../../utils/article.ts";
import { formatTimestamp, formatUsd } from "../../utils/format.ts";

import { BodyExcerpt } from "./BodyExcerpt.tsx";
import { EnrichButton } from "./EnrichButton.tsx";
import { SentimentBadge } from "./SentimentBadge.tsx";
import { TopicTags } from "./TopicTags.tsx";

interface ArticleCardProps {
    article: Article;
    onEnriched: (article: Article) => void;
}

/**
 * Wireframe article card with enrichment details and enrich action.
 */
export function ArticleCard(props: ArticleCardProps): ReactElement {
    const { article } = props;
    const headline = article.headline ?? "(no headline)";
    const isEnriched = isArticleEnriched(article);

    return (
        <article className="article-card">
            <div className="article-meta">
                <span>#{article.id}</span>
                <span>{article.source}</span>
                <span>{formatTimestamp(article.published_at)}</span>
                <span>{article.language}</span>
            </div>

            <h3 className="article-headline" dir="auto">
                {headline}
            </h3>

            {isEnriched ? (
                <div className="enrichment-block">
                    <p className="article-summary" dir="auto">
                        {article.summary}
                    </p>
                    {article.sentiment !== null ? (
                        <SentimentBadge sentiment={article.sentiment} />
                    ) : null}
                    {article.topic_tags !== null ? (
                        <TopicTags tags={article.topic_tags} />
                    ) : null}
                    <p className="muted">
                        {article.model_handle !== null ? `Model: ${article.model_handle}` : null}
                        {article.enriched_at !== null
                            ? ` · Enriched ${formatTimestamp(article.enriched_at)}`
                            : null}
                        {article.cost_usd !== null
                            ? ` · Cost ${formatUsd(article.cost_usd)}`
                            : null}
                    </p>
                </div>
            ) : (
                <p className="muted">Not enriched</p>
            )}

            <BodyExcerpt body={article.body} />

            <EnrichButton article={article} onEnriched={props.onEnriched} />
        </article>
    );
}
