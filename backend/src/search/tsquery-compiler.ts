"use strict";

import type { CompiledTsQuery, QueryNode } from "./types.js";

interface CompileState {
    paramIndex: number;
    params: string[];
}

/**
 * Allocate the next SQL parameter placeholder and record its value.
 */
function nextParameter(state: CompileState, value: string): string {
    const placeholder = `$${state.paramIndex}`;
    state.params.push(value);
    state.paramIndex = state.paramIndex + 1;
    return placeholder;
}

/**
 * Compile a plain term leaf to plainto_tsquery.
 */
function compilePlainTerm(state: CompileState, value: string): string {
    const parameter = nextParameter(state, value);
    const sql = `plainto_tsquery('simple', ${parameter})`;
    return sql;
}

/**
 * Compile a prefix wildcard term leaf to to_tsquery with quote_literal.
 */
function compilePrefixTerm(state: CompileState, value: string): string {
    const parameter = nextParameter(state, value);
    const sql = `to_tsquery('simple', quote_literal(lower(${parameter})) || ':*')`;
    return sql;
}

/**
 * Compile a phrase leaf to phraseto_tsquery.
 */
function compilePhrase(state: CompileState, value: string): string {
    const parameter = nextParameter(state, value);
    const sql = `phraseto_tsquery('simple', ${parameter})`;
    return sql;
}

/**
 * Combine multiple SQL fragments with a tsquery boolean operator.
 */
function combineFragments(operator: string, fragments: string[]): string {
    if (fragments.length === 1) {
        const singleFragment = fragments[0];
        return singleFragment;
    }

    let combinedSql = fragments[0];

    for (let fragmentIndex = 1; fragmentIndex < fragments.length; fragmentIndex = fragmentIndex + 1) {
        combinedSql = `(${combinedSql} ${operator} ${fragments[fragmentIndex]})`;
    }

    return combinedSql;
}

/**
 * Compile a boolean query AST node to a parameterised SQL tsquery expression.
 */
function compileNode(state: CompileState, node: QueryNode): string {
    if (node.kind === "term") {
        if (node.prefix) {
            const prefixSql = compilePrefixTerm(state, node.value);
            return prefixSql;
        }

        const termSql = compilePlainTerm(state, node.value);
        return termSql;
    }

    if (node.kind === "phrase") {
        const phraseSql = compilePhrase(state, node.value);
        return phraseSql;
    }

    if (node.kind === "not") {
        const childSql = compileNode(state, node.child);
        const negatedSql = `(!!(${childSql}))`;
        return negatedSql;
    }

    const childFragments: string[] = [];

    for (const child of node.children) {
        childFragments.push(compileNode(state, child));
    }

    const operator = node.kind === "and" ? "&&" : "||";
    const combinedSql = combineFragments(operator, childFragments);

    return combinedSql;
}

/**
 * Compile a parsed boolean query AST into SQL and bind parameters.
 */
export function compileTsQuery(
    node: QueryNode,
    startParamIndex = 1,
): CompiledTsQuery {
    const state: CompileState = {
        paramIndex: startParamIndex,
        params: [],
    };

    const sql = compileNode(state, node);

    const compiled: CompiledTsQuery = {
        sql,
        params: state.params,
        nextParamIndex: state.paramIndex,
    };

    return compiled;
}
