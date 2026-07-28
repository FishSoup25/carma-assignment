"use strict";

import { BooleanQueryError } from "./errors.js";
import type { AndNode, OrNode, QueryNode } from "./types.js";

const MAX_QUERY_LENGTH = 512;
const MAX_TERM_LENGTH = 64;
const MAX_LEAF_COUNT = 64;
const MAX_QUERY_DEPTH = 12;

interface QueryMetrics {
    leafCount: number;
    maxDepth: number;
}

/**
 * Validate query string length before tokenization.
 */
export function validateQueryLength(input: string): void {
    if (input.trim().length === 0) {
        throw new BooleanQueryError("empty_query", "Query cannot be empty");
    }

    if (input.length > MAX_QUERY_LENGTH) {
        throw new BooleanQueryError(
            "query_too_long",
            `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`,
        );
    }
}

/**
 * Validate a single leaf term or phrase length.
 */
export function validateLeafLength(value: string, position: number): void {
    const strippedValue = value.endsWith("*") ? value.slice(0, -1) : value;

    if (strippedValue.length > MAX_TERM_LENGTH) {
        throw new BooleanQueryError(
            "term_too_long",
            `Term exceeds maximum length of ${MAX_TERM_LENGTH} characters`,
            position,
        );
    }
}

/**
 * Collect leaf count and maximum depth from an AST.
 */
export function collectQueryMetrics(node: QueryNode, currentDepth: number): QueryMetrics {
    const metrics: QueryMetrics = {
        leafCount: 0,
        maxDepth: currentDepth,
    };

    if (node.kind === "term" || node.kind === "phrase") {
        metrics.leafCount = 1;
        return metrics;
    }

    if (node.kind === "not") {
        const childMetrics = collectQueryMetrics(node.child, currentDepth + 1);
        const result: QueryMetrics = {
            leafCount: childMetrics.leafCount,
            maxDepth: childMetrics.maxDepth,
        };
        return result;
    }

    let totalLeaves = 0;
    let deepestDepth = currentDepth;

    for (const child of node.children) {
        const childMetrics = collectQueryMetrics(child, currentDepth + 1);

        totalLeaves = totalLeaves + childMetrics.leafCount;

        if (childMetrics.maxDepth > deepestDepth) {
            deepestDepth = childMetrics.maxDepth;
        }
    }

    const combinedMetrics: QueryMetrics = {
        leafCount: totalLeaves,
        maxDepth: deepestDepth,
    };

    return combinedMetrics;
}

/**
 * Validate AST complexity limits for depth and leaf count.
 */
export function validateQueryComplexity(node: QueryNode): void {
    const metrics = collectQueryMetrics(node, 1);

    if (metrics.leafCount > MAX_LEAF_COUNT) {
        throw new BooleanQueryError(
            "too_many_terms",
            `Query exceeds maximum of ${MAX_LEAF_COUNT} search terms`,
        );
    }

    if (metrics.maxDepth > MAX_QUERY_DEPTH) {
        throw new BooleanQueryError(
            "query_too_deep",
            `Query exceeds maximum nesting depth of ${MAX_QUERY_DEPTH}`,
        );
    }
}

/**
 * Reject root-level pure negation queries that cannot use the GIN index efficiently.
 */
export function validateRootNegation(node: QueryNode): void {
    if (node.kind === "not") {
        throw new BooleanQueryError(
            "unsupported_query",
            "Root-level negation is not supported; combine NOT with a positive term",
        );
    }
}

/**
 * Flatten consecutive AND nodes into a single n-ary AND node.
 */
export function flattenAndNode(left: QueryNode, right: QueryNode): AndNode {
    const children: QueryNode[] = [];

    if (left.kind === "and") {
        for (const child of left.children) {
            children.push(child);
        }
    } else {
        children.push(left);
    }

    if (right.kind === "and") {
        for (const child of right.children) {
            children.push(child);
        }
    } else {
        children.push(right);
    }

    const andNode: AndNode = {
        kind: "and",
        children,
    };

    return andNode;
}

/**
 * Flatten consecutive OR nodes into a single n-ary OR node.
 */
export function flattenOrNode(left: QueryNode, right: QueryNode): OrNode {
    const children: QueryNode[] = [];

    if (left.kind === "or") {
        for (const child of left.children) {
            children.push(child);
        }
    } else {
        children.push(left);
    }

    if (right.kind === "or") {
        for (const child of right.children) {
            children.push(child);
        }
    } else {
        children.push(right);
    }

    const orNode: OrNode = {
        kind: "or",
        children,
    };

    return orNode;
}
