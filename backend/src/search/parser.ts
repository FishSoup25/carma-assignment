"use strict";

import { BooleanQueryError } from "./errors.js";
import { flattenNode, validateLeafLength } from "./guards.js";
import type {
    PhraseNode,
    QueryNode,
    TermNode,
    Token,
} from "./types.js";

interface ParserState {
    tokens: Token[];
    index: number;
}

/**
 * Return the current token without consuming it.
 */
function currentToken(state: ParserState): Token {
    const token = state.tokens[state.index];
    return token;
}

/**
 * Consume and return the current token.
 */
function consumeToken(state: ParserState): Token {
    const token = currentToken(state);
    state.index = state.index + 1;
    return token;
}

/**
 * Check whether the current token matches an expected type.
 */
function matchToken(state: ParserState, expectedType: Token["type"]): boolean {
    const token = currentToken(state);
    const matches = token.type === expectedType;
    return matches;
}

/**
 * Parse a term token into an AST term node.
 */
function parseTermNode(token: Token): TermNode {
    const hasWildcard = token.value.endsWith("*");
    let termValue = token.value;

    if (hasWildcard) {
        termValue = token.value.slice(0, -1);
    }

    validateLeafLength(termValue, token.position);

    const termNode: TermNode = {
        kind: "term",
        value: termValue,
        prefix: hasWildcard,
    };

    return termNode;
}

/**
 * Parse a phrase token into an AST phrase node.
 */
function parsePhraseNode(token: Token): PhraseNode {
    validateLeafLength(token.value, token.position);

    const phraseNode: PhraseNode = {
        kind: "phrase",
        value: token.value,
    };

    return phraseNode;
}

/**
 * Parse a primary expression: parenthesised sub-expression, phrase, or term.
 */
function parsePrimary(state: ParserState): QueryNode {
    const token = currentToken(state);

    if (token.type === "LPAREN") {
        consumeToken(state);
        const expression = parseExpression(state);

        if (!matchToken(state, "RPAREN")) {
            throw new BooleanQueryError(
                "unbalanced_parentheses",
                "Missing closing parenthesis",
                token.position,
            );
        }

        consumeToken(state);
        return expression;
    }

    if (token.type === "PHRASE") {
        consumeToken(state);
        const phraseNode = parsePhraseNode(token);
        return phraseNode;
    }

    if (token.type === "TERM") {
        consumeToken(state);
        const termNode = parseTermNode(token);
        return termNode;
    }

    if (token.type === "RPAREN") {
        throw new BooleanQueryError(
            "unbalanced_parentheses",
            "Unexpected closing parenthesis",
            token.position,
        );
    }

    if (token.type === "AND" || token.type === "OR") {
        throw new BooleanQueryError(
            "trailing_operator",
            `Unexpected operator ${token.value}`,
            token.position,
        );
    }

    throw new BooleanQueryError(
        "syntax_error",
        "Expected term, phrase, or parenthesis",
        token.position,
    );
}

/**
 * Parse unary expressions including optional NOT prefix.
 */
function parseUnary(state: ParserState): QueryNode {
    if (matchToken(state, "NOT")) {
        consumeToken(state);
        const child = parseUnary(state);
        const notNode = {
            kind: "not" as const,
            child,
        };

        return notNode;
    }

    const primaryNode = parsePrimary(state);
    return primaryNode;
}

/**
 * Parse AND expressions with implicit adjacency.
 */
function parseAndExpr(state: ParserState): QueryNode {
    let leftNode = parseUnary(state);

    while (true) {
        const isExplicitAnd = matchToken(state, "AND");
        const isImplicitAnd = matchToken(state, "TERM")
            || matchToken(state, "PHRASE")
            || matchToken(state, "NOT")
            || matchToken(state, "LPAREN");

        if (!isExplicitAnd && !isImplicitAnd) {
            break;
        }

        if (isExplicitAnd) {
            consumeToken(state);
        }

        const rightNode = parseUnary(state);
        leftNode = flattenNode({
            kind: "and",
            left: leftNode,
            right: rightNode,
        });
    }

    return leftNode;
}

/**
 * Parse OR expressions with lowest precedence.
 */
function parseOrExpr(state: ParserState): QueryNode {
    let leftNode = parseAndExpr(state);

    while (matchToken(state, "OR")) {
        consumeToken(state);
        const rightNode = parseAndExpr(state);
        leftNode = flattenNode({
            kind: "or",
            left: leftNode,
            right: rightNode,
        });
    }

    return leftNode;
}

/**
 * Parse a full boolean query expression.
 */
function parseExpression(state: ParserState): QueryNode {
    const expression = parseOrExpr(state);
    return expression;
}

/**
 * Parse tokenized boolean query input into an AST.
 */
export function parseBooleanQuery(tokens: Token[]): QueryNode {
    const state: ParserState = {
        tokens,
        index: 0,
    };

    const expression = parseExpression(state);

    if (!matchToken(state, "EOF")) {
        const trailingToken = currentToken(state);

        throw new BooleanQueryError(
            "syntax_error",
            `Unexpected token: ${trailingToken.value}`,
            trailingToken.position,
        );
    }

    return expression;
}

/**
 * Collapse a single-child AND/OR node to its child for cleaner AST output.
 */
export function normalizeQueryNode(node: QueryNode): QueryNode {
    if (node.kind === "not") {
        const notNode = {
            kind: "not" as const,
            child: normalizeQueryNode(node.child),
        };

        return notNode;
    }

    if (node.kind !== "and" && node.kind !== "or") {
        return node;
    }

    if (node.children.length === 1) {
        const normalizedChild = normalizeQueryNode(node.children[0]);
        return normalizedChild;
    }

    const normalizedChildren: QueryNode[] = [];

    for (const child of node.children) {
        normalizedChildren.push(normalizeQueryNode(child));
    }

    const normalizedNode = {
        kind: node.kind,
        children: normalizedChildren,
    };

    return normalizedNode;
}
