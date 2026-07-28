"use strict";

/**
 * Error codes for boolean query parsing and validation failures.
 */
export type BooleanQueryErrorCode =
    | "empty_query"
    | "syntax_error"
    | "unbalanced_parentheses"
    | "unterminated_quote"
    | "invalid_term"
    | "trailing_operator"
    | "query_too_long"
    | "term_too_long"
    | "too_many_terms"
    | "query_too_deep"
    | "unsupported_query"
    | "no_lexeme";

/**
 * Structured error thrown when a boolean query cannot be parsed or compiled.
 */
export class BooleanQueryError extends Error {
    public readonly code: BooleanQueryErrorCode;
    public readonly position: number | null;

    /**
     * Create a boolean query error with a machine-readable code.
     */
    public constructor(
        code: BooleanQueryErrorCode,
        message: string,
        position: number | null = null,
    ) {
        super(message);
        this.name = "BooleanQueryError";
        this.code = code;
        this.position = position;
    }
}
