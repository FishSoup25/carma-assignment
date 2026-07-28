"use strict";

import type { BooleanQueryAstNode } from "@carma/shared";

import {
    validateQueryComplexity,
    validateQueryLength,
    validateRootNegation,
} from "./guards.js";
import { normalizeQueryNode, parseBooleanQuery } from "./parser.js";
import { tokenizeBooleanQuery } from "./tokenizer.js";
import { compileTsQuery } from "./tsquery-compiler.js";
import type { CompiledTsQuery, QueryNode } from "./types.js";

/**
 * Result of compiling a boolean query string end-to-end.
 */
export interface CompiledBooleanQuery {
    ast: QueryNode;
    compiled: CompiledTsQuery;
}

/**
 * Convert an internal AST node to a serializable shared type.
 */
export function serializeAstNode(node: QueryNode): BooleanQueryAstNode {
    if (node.kind === "term") {
        const serialized: BooleanQueryAstNode = {
            kind: "term",
            value: node.value,
            prefix: node.prefix,
        };

        return serialized;
    }

    if (node.kind === "phrase") {
        const serialized: BooleanQueryAstNode = {
            kind: "phrase",
            value: node.value,
        };

        return serialized;
    }

    if (node.kind === "not") {
        const serialized: BooleanQueryAstNode = {
            kind: "not",
            child: serializeAstNode(node.child),
        };

        return serialized;
    }

    if (node.kind === "and") {
        const children: BooleanQueryAstNode[] = [];

        for (const child of node.children) {
            children.push(serializeAstNode(child));
        }

        const serialized: BooleanQueryAstNode = {
            kind: "and",
            children,
        };

        return serialized;
    }

    const children: BooleanQueryAstNode[] = [];

    for (const child of node.children) {
        children.push(serializeAstNode(child));
    }

    const serialized: BooleanQueryAstNode = {
        kind: "or",
        children,
    };

    return serialized;
}

/**
 * Parse, validate, and compile a boolean query string.
 */
export function compileBooleanQuery(
    input: string,
    startParamIndex = 1,
): CompiledBooleanQuery {
    validateQueryLength(input);

    const tokens = tokenizeBooleanQuery(input);
    const parsedAst = parseBooleanQuery(tokens);
    const ast = normalizeQueryNode(parsedAst);

    validateQueryComplexity(ast);
    validateRootNegation(ast);

    const compiled = compileTsQuery(ast, startParamIndex);

    const result: CompiledBooleanQuery = {
        ast,
        compiled,
    };

    return result;
}
