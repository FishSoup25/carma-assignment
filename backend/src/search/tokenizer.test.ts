"use strict";

import { describe, expect, it } from "vitest";

import { BooleanQueryError } from "./errors.js";
import { tokenizeBooleanQuery } from "./tokenizer.js";

describe("tokenizeBooleanQuery", function tokenizeBooleanQuerySuite(): void {
    it("tokenizes operators, phrases, and terms", function tokenizesMixedInput(): void {
        const tokens = tokenizeBooleanQuery('"oil prices" AND (geopolitical OR supply)');
        const tokenTypes: string[] = [];

        for (const token of tokens) {
            tokenTypes.push(token.type);
        }

        expect(tokenTypes).toEqual([
            "PHRASE",
            "AND",
            "LPAREN",
            "TERM",
            "OR",
            "TERM",
            "RPAREN",
            "EOF",
        ]);
    });

    it("treats lowercase and as a term", function treatsLowercaseAndAsTerm(): void {
        const tokens = tokenizeBooleanQuery("wind and solar");

        expect(tokens[0].type).toBe("TERM");
        expect(tokens[0].value).toBe("wind");
        expect(tokens[1].type).toBe("TERM");
        expect(tokens[1].value).toBe("and");
    });

    it("tokenizes prefix wildcards", function tokenizesPrefixWildcard(): void {
        const tokens = tokenizeBooleanQuery("renew*");

        expect(tokens[0].type).toBe("TERM");
        expect(tokens[0].value).toBe("renew*");
    });

    it("rejects empty queries", function rejectsEmptyQuery(): void {
        expect(function throwEmpty(): void {
            tokenizeBooleanQuery("   ");
        }).toThrow(BooleanQueryError);
    });

    it("rejects unterminated quotes", function rejectsUnterminatedQuote(): void {
        expect(function throwUnterminated(): void {
            tokenizeBooleanQuery('"oil prices');
        }).toThrow(BooleanQueryError);
    });

    it("rejects lexeme-less terms", function rejectsLexemeLessTerm(): void {
        expect(function throwLexemeLess(): void {
            tokenizeBooleanQuery("!!!");
        }).toThrow(BooleanQueryError);
    });

    it("rejects inline wildcards", function rejectsInlineWildcard(): void {
        expect(function throwInlineWildcard(): void {
            tokenizeBooleanQuery("re*new");
        }).toThrow(BooleanQueryError);
    });
});
