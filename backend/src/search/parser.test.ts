"use strict";

import { describe, expect, it } from "vitest";

import { BooleanQueryError } from "./errors.js";
import { parseBooleanQuery, normalizeQueryNode } from "./parser.js";
import { tokenizeBooleanQuery } from "./tokenizer.js";

describe("parseBooleanQuery", function parseBooleanQuerySuite(): void {
    it("parses operator precedence with OR below AND", function parsesPrecedence(): void {
        const tokens = tokenizeBooleanQuery("a AND b OR c");
        const ast = normalizeQueryNode(parseBooleanQuery(tokens));

        expect(ast.kind).toBe("or");
    });

    it("parses implicit AND between adjacent terms", function parsesImplicitAnd(): void {
        const tokens = tokenizeBooleanQuery("renewable energy");
        const ast = normalizeQueryNode(parseBooleanQuery(tokens));

        expect(ast.kind).toBe("and");
    });

    it("parses AND NOT as conjunction with negation", function parsesAndNot(): void {
        const tokens = tokenizeBooleanQuery("renewable AND NOT nuclear");
        const ast = normalizeQueryNode(parseBooleanQuery(tokens));

        expect(ast.kind).toBe("and");
    });

    it("parses nested parentheses", function parsesNestedParentheses(): void {
        const tokens = tokenizeBooleanQuery('"oil prices" AND (geopolitical OR "supply chain")');
        const ast = normalizeQueryNode(parseBooleanQuery(tokens));

        expect(ast.kind).toBe("and");
    });

    it("rejects unbalanced parentheses", function rejectsUnbalancedParentheses(): void {
        expect(function throwUnbalanced(): void {
            const tokens = tokenizeBooleanQuery("(a AND b");
            parseBooleanQuery(tokens);
        }).toThrow(BooleanQueryError);
    });

    it("rejects trailing operators", function rejectsTrailingOperator(): void {
        expect(function throwTrailing(): void {
            const tokens = tokenizeBooleanQuery("a AND");
            parseBooleanQuery(tokens);
        }).toThrow(BooleanQueryError);
    });
});
