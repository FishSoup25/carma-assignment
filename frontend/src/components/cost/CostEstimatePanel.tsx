"use strict";

import type { ReactElement } from "react";

import type { EnrichmentCostEstimateResponse } from "@carma/shared";

import { formatUsd, formatUsdCoarse } from "../../utils/format.ts";

interface CostEstimatePanelProps {
    estimate: EnrichmentCostEstimateResponse;
}

/**
 * Wireframe panel showing LLM cost estimate and projections.
 */
export function CostEstimatePanel(props: CostEstimatePanelProps): ReactElement {
    const { estimate } = props;
    const budget = estimate.guardrails.daily_budget_usd;
    let budgetPercent = 0;

    if (budget > 0) {
        budgetPercent = Math.min((estimate.today_spent_usd / budget) * 100, 100);
    }

    return (
        <div className="stack">
            <div className="panel">
                <h2>LLM cost estimate</h2>
                <p className="muted">
                    Model: {estimate.model} · Basis: {estimate.basis}
                    {estimate.basis === "estimated"
                        ? " (no enriched articles — costs shown as $0)"
                        : " (average of stored article cost_usd values)"}
                </p>
                <div className="cost-grid">
                    <div className="cost-stat">
                        <span>Cost per article</span>
                        <strong>{formatUsd(estimate.cost_per_article_usd)}</strong>
                    </div>
                    <div className="cost-stat">
                        <span>Projected daily at 50k articles</span>
                        <strong>{formatUsdCoarse(estimate.projected_daily_usd_at_50k)}</strong>
                    </div>
                    <div className="cost-stat">
                        <span>Projected monthly at 50k/day</span>
                        <strong>{formatUsdCoarse(estimate.projected_monthly_usd_at_50k)}</strong>
                    </div>
                    <div className="cost-stat">
                        <span>Cost to enrich remaining</span>
                        <strong>{formatUsd(estimate.cost_to_enrich_remaining_usd)}</strong>
                    </div>
                </div>
            </div>

            <div className="panel">
                <h3>Usage stats</h3>
                <ul>
                    <li>Articles: {estimate.article_count}</li>
                    <li>Enriched: {estimate.enriched_count}</li>
                    <li>Unenriched: {estimate.unenriched_count}</li>
                    <li>
                        Avg prompt tokens: {Math.round(estimate.average_prompt_tokens)}
                    </li>
                    <li>
                        Avg completion tokens: {Math.round(estimate.average_completion_tokens)}
                    </li>
                    <li>Total spent: {formatUsd(estimate.total_spent_usd)}</li>
                    <li>Today spent: {formatUsd(estimate.today_spent_usd)}</li>
                </ul>
                <p>
                    Today&apos;s spend vs daily budget ({formatUsdCoarse(budget)})
                </p>
                <div className="budget-bar-track">
                    <div
                        className="budget-bar-fill"
                        style={{ width: `${budgetPercent}%` }}
                    />
                </div>
            </div>

            <div className="panel">
                <h3>Pricing</h3>
                <ul>
                    <li>
                        Prompt: {formatUsdCoarse(estimate.pricing.prompt_per_million)} / 1M tokens
                    </li>
                    <li>
                        Completion: {formatUsdCoarse(estimate.pricing.completion_per_million)} / 1M tokens
                    </li>
                </ul>
            </div>

            <div className="panel">
                <h3>Guardrails</h3>
                <ul>
                    <li>Daily budget: {formatUsdCoarse(estimate.guardrails.daily_budget_usd)}</li>
                    <li>Max headline chars: {estimate.guardrails.max_headline_chars}</li>
                    <li>Max body chars: {estimate.guardrails.max_body_chars}</li>
                    <li>Max output tokens: {estimate.guardrails.max_output_tokens}</li>
                    <li>Max retries: {estimate.guardrails.max_retries}</li>
                </ul>
            </div>
        </div>
    );
}
