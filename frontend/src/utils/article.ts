"use strict";

import type { Article } from "@carma/shared";

/**
 * Determine whether an article carries a complete LLM enrichment.
 *
 * The enrichment columns are written in a single transaction, so a row is
 * either fully enriched or not enriched at all. Checking every column in one
 * place keeps the card display and the enrich button from disagreeing about
 * whether an article needs work.
 */
export function isArticleEnriched(article: Article): boolean {
    const enriched = article.summary !== null
        && article.sentiment !== null
        && article.topic_tags !== null
        && article.enriched_at !== null;

    return enriched;
}
