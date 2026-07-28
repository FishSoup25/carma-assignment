"use strict";

import { describe, expect, it } from "vitest";

import { BooleanQueryError } from "./errors.js";
import { compileBooleanQuery } from "./compile-boolean-query.js";
import { compileTsQuery } from "./tsquery-compiler.js";
import type { AndNode, OrNode, PhraseNode, TermNode } from "./types.js";

describe("compileTsQuery", function compileTsQuerySuite(): void {
    it("compiles plain terms with bind parameters", function compilesPlainTerm(): void {
        const termNode: TermNode = {
            kind: "term",
            value: "oil",
            prefix: false,
        };

        const compiled = compileTsQuery(termNode);

        expect(compiled.sql).toBe("plainto_tsquery('simple', $1)");
        expect(compiled.params).toEqual(["oil"]);
        expect(compiled.nextParamIndex).toBe(2);
    });

    it("compiles prefix terms with quote_literal", function compilesPrefixTerm(): void {
        const termNode: TermNode = {
            kind: "term",
            value: "renew",
            prefix: true,
        };

        const compiled = compileTsQuery(termNode);

        expect(compiled.sql).toBe("to_tsquery('simple', quote_literal(lower($1)) || ':*')");
        expect(compiled.params).toEqual(["renew"]);
    });

    it("compiles phrases with phraseto_tsquery", function compilesPhrase(): void {
        const phraseNode: PhraseNode = {
            kind: "phrase",
            value: "oil prices",
        };

        const compiled = compileTsQuery(phraseNode);

        expect(compiled.sql).toBe("phraseto_tsquery('simple', $1)");
        expect(compiled.params).toEqual(["oil prices"]);
    });

    it("compiles AND, OR, and NOT nodes", function compilesBooleanNodes(): void {
        const andNode: AndNode = {
            kind: "and",
            children: [
                {
                    kind: "term",
                    value: "AI",
                    prefix: false,
                },
                {
                    kind: "not",
                    child: {
                        kind: "term",
                        value: "startup",
                        prefix: true,
                    },
                },
            ],
        };

        const compiled = compileTsQuery(andNode);

        expect(compiled.sql).toContain("&&");
        expect(compiled.sql).toContain("!!");
        expect(compiled.params).toEqual(["AI", "startup"]);
    });

    it("honours a custom starting parameter index", function honoursStartIndex(): void {
        const orNode: OrNode = {
            kind: "or",
            children: [
                {
                    kind: "term",
                    value: "a",
                    prefix: false,
                },
                {
                    kind: "term",
                    value: "b",
                    prefix: false,
                },
            ],
        };

        const compiled = compileTsQuery(orNode, 3);

        expect(compiled.sql).toContain("$3");
        expect(compiled.sql).toContain("$4");
        expect(compiled.nextParamIndex).toBe(5);
    });
});

describe("compileBooleanQuery", function compileBooleanQuerySuite(): void {
    it("rejects root-level negation", function rejectsRootNegation(): void {
        expect(function throwRootNegation(): void {
            compileBooleanQuery("NOT nuclear");
        }).toThrow(BooleanQueryError);
    });

    it("rejects queries exceeding max length", function rejectsLongQuery(): void {
        const longTerm = "a".repeat(600);

        expect(function throwLongQuery(): void {
            compileBooleanQuery(longTerm);
        }).toThrow(BooleanQueryError);
    });
});
