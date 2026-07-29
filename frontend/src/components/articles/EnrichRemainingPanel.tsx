"use strict";

import { useState, type ReactElement } from "react";

import { ActionButton } from "../common/ActionButton.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";

import {
    runEnrichRemaining,
    type EnrichRemainingProgress,
    type EnrichRemainingSummary,
} from "./enrichRemainingRunner.ts";

interface EnrichRemainingPanelProps {
    onCompleted: () => void;
}

/**
 * Build the status banner text and variant from a batch summary.
 */
function buildSummaryStatus(summary: EnrichRemainingSummary): {
    text: string;
    variant: "success" | "error" | "info";
} {
    if (summary.total === 0) {
        const emptyStatus = {
            text: "All articles are already enriched.",
            variant: "success" as const,
        };
        return emptyStatus;
    }

    let text = `Enriched ${summary.completed} of ${summary.total} articles concurrently`;
    let variant: "success" | "error" | "info" = "success";

    if (summary.failed > 0) {
        text = `${text} (${summary.failed} failed)`;
        variant = summary.completed > 0 ? "info" : "error";
    }

    if (summary.notes.length > 0) {
        text = `${text}. ${summary.notes.join("; ")}`;
    }

    text = `${text}.`;

    const status = { text, variant };
    return status;
}

/**
 * Panel that enriches every unenriched article concurrently.
 */
export function EnrichRemainingPanel(props: EnrichRemainingPanelProps): ReactElement {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<EnrichRemainingProgress | null>(null);
    const [summary, setSummary] = useState<EnrichRemainingSummary | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleEnrichRemaining(): Promise<void> {
        setIsRunning(true);
        setErrorMessage(null);
        setSummary(null);

        try {
            const result = await runEnrichRemaining({
                onProgress: setProgress,
            });
            setSummary(result);
            setProgress(null);
            props.onCompleted();
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Failed to enrich remaining articles";

            setErrorMessage(message);
            setProgress(null);
        } finally {
            setIsRunning(false);
        }
    }

    const summaryStatus = summary !== null ? buildSummaryStatus(summary) : null;

    return (
        <div className="panel">
            <h2>Enrich remaining articles</h2>
            <p className="muted">
                Runs LLM enrichment concurrently for every article that is not yet
                enriched. Already-enriched articles are left unchanged.
            </p>
            <ActionButton
                label={isRunning ? "Enriching..." : "Enrich all remaining articles"}
                onClick={function onEnrichRemainingClick(): void {
                    void handleEnrichRemaining();
                }}
                disabled={isRunning}
            />
            {progress !== null ? (
                <StatusMessage
                    variant="info"
                    message={
                        progress.total === 0
                            ? "Looking up unenriched articles..."
                            : `Enriching ${progress.total} articles concurrently (${progress.completed + progress.failed}/${progress.total} settled)...`
                    }
                />
            ) : null}
            {summaryStatus !== null ? (
                <StatusMessage
                    variant={summaryStatus.variant}
                    message={summaryStatus.text}
                />
            ) : null}
            {errorMessage !== null ? (
                <StatusMessage variant="error" message={errorMessage} />
            ) : null}
        </div>
    );
}
