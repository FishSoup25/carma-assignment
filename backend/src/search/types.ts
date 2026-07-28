"use strict";

/**
 * Token kinds produced by the boolean query tokenizer.
 */
export type TokenType =
    | "AND"
    | "OR"
    | "NOT"
    | "LPAREN"
    | "RPAREN"
    | "PHRASE"
    | "TERM"
    | "EOF";

/**
 * A single token from the boolean query tokenizer.
 */
export interface Token {
    type: TokenType;
    value: string;
    position: number;
}

/**
 * AST node representing a plain or prefix-wildcard search term.
 */
export interface TermNode {
    kind: "term";
    value: string;
    prefix: boolean;
}

/**
 * AST node representing a double-quoted phrase.
 */
export interface PhraseNode {
    kind: "phrase";
    value: string;
}

/**
 * AST node representing a conjunction of child nodes.
 */
export interface AndNode {
    kind: "and";
    children: QueryNode[];
}

/**
 * AST node representing a disjunction of child nodes.
 */
export interface OrNode {
    kind: "or";
    children: QueryNode[];
}

/**
 * AST node representing negation of a child node.
 */
export interface NotNode {
    kind: "not";
    child: QueryNode;
}

/**
 * Root AST node type for a parsed boolean query.
 */
export type QueryNode = TermNode | PhraseNode | AndNode | OrNode | NotNode;

/**
 * Result of compiling a boolean query AST to a parameterised SQL tsquery expression.
 */
export interface CompiledTsQuery {
    sql: string;
    params: string[];
    nextParamIndex: number;
}
