/**
 * Sentiment classification produced by LLM enrichment.
 */
export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

/**
 * Raw article as provided in sample_articles.json.
 */
export interface Article {
  id: number;
  headline: string;
  body: string;
  source: string;
  published_at: string;
  language: string;
}

/**
 * LLM-generated enrichment metadata for an article.
 */
export interface ArticleEnrichment {
  summary: string;
  sentiment: Sentiment;
  topics: string[];
}

/**
 * Article with enrichment data attached.
 */
export interface EnrichedArticle extends Article {
  enrichment: ArticleEnrichment | null;
}

/**
 * Pagination cursor for keyset-based article listing.
 */
export interface PaginationCursor {
  published_at: string;
  id: number;
}

/**
 * Paginated list of articles.
 */
export interface PaginatedArticlesResponse {
  items: EnrichedArticle[];
  next_cursor: PaginationCursor | null;
  has_more: boolean;
}

/**
 * Monthly or weekly article count for dashboard aggregates.
 */
export interface ArticleCountBucket {
  period_start: string;
  count: number;
}

/**
 * Aggregate counts grouped by time period.
 */
export interface ArticleCountsResponse {
  buckets: ArticleCountBucket[];
  granularity: 'month' | 'week';
}

/**
 * Search request parameters.
 */
export interface SearchArticlesRequest {
  query: string;
  cursor?: PaginationCursor;
  limit?: number;
}

/**
 * Standard API error shape.
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
}

/**
 * Health check response.
 */
export interface HealthResponse {
  status: 'ok';
  service: string;
}
