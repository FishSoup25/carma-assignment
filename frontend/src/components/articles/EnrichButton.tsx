"use strict";

import { useState, type ReactElement } from "react";

import type { Article } from "@carma/shared";

import { enrichArticle } from "../../api/articles.ts";
import { ApiRequestError } from "../../api/client.ts";

import { ActionButton } from "../common/ActionButton.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";

interface EnrichButtonProps {
    article: Article;
    onEnriched: (article: Article) => void;
}

type EnrichPhase = "idle" | "running" | "confirm" | "forcing" | "done" | "failed";

/**
 * Determine whether an article already has enrichment fields.
 */
function isAlreadyEnriched(article: Article): boolean {
    const enriched = article.summary !== null
        && article.sentiment !== null
        && article.topic_tags !== null
        && article.enriched_at !== null;

    return enriched;
}

/**
 * Map enrichment API error codes to friendly messages.
 */
function messageForEnrichmentError(error: Error | ApiRequestError): string {
    if (error instanceof ApiRequestError) {
        if (error.code === "llm_not_configured") {
            return "OPENROUTER_API_KEY is not set";
        }

        if (error.code === "budget_exceeded") {
            return "Daily LLM budget reached";
        }

        if (error.code === "llm_rate_limited") {
            return "Rate limited, try again";
        }

        if (error.code === "article_empty") {
            return "No usable headline or body";
        }

        return error.message;
    }

    return error.message;
}

/**
 * Enrich button with already-enriched confirmation and force overwrite.
 */
export function EnrichButton(props: EnrichButtonProps): ReactElement {
    const alreadyEnriched = isAlreadyEnriched(props.article);
    const [phase, setPhase] = useState<EnrichPhase>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [truncatedNote, setTruncatedNote] = useState<string | null>(null);

    async function runEnrichment(force: boolean): Promise<void> {
        setErrorMessage(null);
        setTruncatedNote(null);
        setPhase(force ? "forcing" : "running");

        try {
            const response = await enrichArticle({
                articleId: props.article.id,
                force,
            });

            if (response.cached && !force) {
                setPhase("confirm");
                return;
            }

            props.onEnriched(response.article);

            if (response.truncated) {
                setTruncatedNote("Body was truncated before sending to the LLM.");
            }

            setPhase("done");
        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(messageForEnrichmentError(error));
            } else {
                setErrorMessage("Enrichment failed");
            }

            setPhase("failed");
        }
    }

    const isBusy = phase === "running" || phase === "forcing";
    const primaryLabel = alreadyEnriched ? "Re-enrich" : "Enrich";

    return (
        <div>
            {phase !== "confirm" ? (
                <ActionButton
                    label={isBusy ? "Enriching..." : primaryLabel}
                    onClick={function handlePrimaryClick(): void {
                        if (alreadyEnriched) {
                            setPhase("confirm");
                            return;
                        }

                        void runEnrichment(false);
                    }}
                    disabled={isBusy}
                />
            ) : null}

            {phase === "confirm" ? (
                <ConfirmOverwritePanel
                    article={props.article}
                    isBusy={isBusy}
                    onConfirm={function handleConfirm(): void {
                        void runEnrichment(true);
                    }}
                    onCancel={function handleCancel(): void {
                        setPhase("idle");
                        setErrorMessage(null);
                    }}
                />
            ) : null}

            {phase === "done" ? (
                <StatusMessage message="Enrichment saved." variant="success" />
            ) : null}

            {truncatedNote !== null ? (
                <StatusMessage message={truncatedNote} variant="info" />
            ) : null}

            {errorMessage !== null ? (
                <StatusMessage message={errorMessage} variant="error" />
            ) : null}
        </div>
    );
}

interface ConfirmOverwritePanelProps {
    article: Article;
    isBusy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Inline confirmation panel for overwriting existing enrichment.
 */
function ConfirmOverwritePanel(props: ConfirmOverwritePanelProps): ReactElement {
    const enrichedAtText = props.article.enriched_at !== null
        ? ` on ${new Date(props.article.enriched_at).toLocaleString()}`
        : "";
    const modelText = props.article.model_handle !== null
        ? ` using ${props.article.model_handle}`
        : "";

    return (
        <div className="confirm-panel">
            <p>
                Article #{props.article.id} was already enriched{enrichedAtText}{modelText}.
                Re-enrich and overwrite the existing summary, sentiment, and tags?
            </p>
            <div className="row">
                <ActionButton
                    label="Re-enrich (overwrite)"
                    onClick={props.onConfirm}
                    disabled={props.isBusy}
                />
                <ActionButton
                    label="Cancel"
                    onClick={props.onCancel}
                    disabled={props.isBusy}
                />
            </div>
        </div>
    );
}
