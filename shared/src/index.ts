/**
 * Sentiment classification produced by LLM enrichment.
 */
export type Sentiment = "positive" | "negative" | "neutral" | "mixed";

/**
 * Article row matching the `articles` database table.
 */
export interface Article {
  id: number;
  headline: string | null;
  body: string | null;
  source: string;
  published_at: string;
  language: string;
  model_handle: string | null;
  summary: string | null;
  sentiment: Sentiment | null;
  topic_tags: string[] | null;
  enriched_at: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd: number | null;
}

/**
 * LLM enrichment fields stored on an article.
 */
export interface ArticleEnrichment {
  summary: string;
  sentiment: Sentiment;
  topic_tags: string[];
  model_handle: string;
  enriched_at: string;
}

/**
 * Token and cost usage for a single enrichment request.
 */
export interface EnrichmentUsage {
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
}

/**
 * Response from POST /api/articles/:id/enrich.
 */
export interface ArticleEnrichmentResponse {
  article: Article;
  enrichment: ArticleEnrichment;
  usage: EnrichmentUsage;
  cached: boolean;
  truncated: boolean;
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
  items: Article[];
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
  granularity: "month" | "week";
}

/**
 * Search request parameters.
 */
export interface SearchArticlesRequest {
  query: string;
  cursor?: PaginationCursor;
  limit?: number;
  source?: string;
  language?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Boolean query AST node kinds returned by the parse debug endpoint.
 */
export type BooleanQueryNodeKind = "term" | "phrase" | "and" | "or" | "not";

/**
 * Serializable boolean query AST node for parse debug responses.
 */
export interface BooleanQueryAstNode {
  kind: BooleanQueryNodeKind;
  value?: string;
  prefix?: boolean;
  children?: BooleanQueryAstNode[];
  child?: BooleanQueryAstNode;
}

/**
 * Response from the boolean query parse debug endpoint.
 */
export interface BooleanQueryParseResponse {
  query: string;
  ast: BooleanQueryAstNode;
  compiled_sql: string;
  compiled_tsquery: string;
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
  status: "ok";
  service: string;
}
