"use strict";

import { describe, expect, it } from "vitest";

import { resolveRequestCost } from "./cost.js";

describe("resolveRequestCost", function resolveRequestCostSuite(): void {
    it("prefers OpenRouter reported cost when present", function prefersReportedCost(): void {
        const cost = resolveRequestCost({
            model: "qwen/qwen3.6-35b-a3b",
            promptTokens: 1000,
            completionTokens: 200,
            reportedCostUsd: 0.00042,
        });

        expect(cost).toBe(0.00042);
    });

    it("falls back to the pricing table when reported cost is absent", function fallsBackToPricingTable(): void {
        const cost = resolveRequestCost({
            model: "qwen/qwen3.6-35b-a3b",
            promptTokens: 1_000_000,
            completionTokens: 1_000_000,
            reportedCostUsd: null,
        });

        expect(cost).toBeCloseTo(1.10, 5);
    });

    it("still prices a request for a model missing from the pricing table", function pricesUnknownModel(): void {
        const cost = resolveRequestCost({
            model: "unknown/model",
            promptTokens: 1_000_000,
            completionTokens: 0,
            reportedCostUsd: null,
        });

        expect(cost).toBeGreaterThan(0);
    });
});
