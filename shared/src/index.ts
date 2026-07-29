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
 * Distinct filter values for article browse and aggregate UIs.
 */
export interface ArticleFacetsResponse {
  sources: string[];
  languages: string[];
  topic_tags: string[];
}

/**
 * Response from POST /api/admin/seed.
 */
export interface SeedArticlesResponse {
  seeded: number;
  article_count: number;
}

/**
 * Per-million-token pricing echoed in cost estimate responses.
 */
export interface EnrichmentModelPricing {
  prompt_per_million: number;
  completion_per_million: number;
}

/**
 * Guardrail values echoed in cost estimate responses.
 */
export interface EnrichmentCostGuardrails {
  daily_budget_usd: number;
  max_headline_chars: number;
  max_body_chars: number;
  max_output_tokens: number;
  max_retries: number;
}

/**
 * Response from GET /api/enrichment/cost-estimate.
 */
export interface EnrichmentCostEstimateResponse {
  model: string;
  pricing: EnrichmentModelPricing;
  basis: "observed" | "estimated";
  article_count: number;
  enriched_count: number;
  unenriched_count: number;
  average_prompt_tokens: number;
  average_completion_tokens: number;
  cost_per_article_usd: number;
  total_spent_usd: number;
  today_spent_usd: number;
  cost_to_enrich_remaining_usd: number;
  projected_daily_usd_at_50k: number;
  projected_monthly_usd_at_50k: number;
  guardrails: EnrichmentCostGuardrails;
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
