"use strict";

import type { ReactElement } from "react";

import type { SeedArticlesResponse } from "@carma/shared";

import { runSeed } from "../../api/admin.ts";
import { useAsyncAction } from "../../hooks/useAsyncAction.ts";

import { ActionButton } from "../common/ActionButton.tsx";
import { StatusMessage } from "../common/StatusMessage.tsx";

interface SeedPanelProps {
    onSeeded: () => void;
}

/**
 * Panel with a button to run the sample article seed script.
 */
export function SeedPanel(props: SeedPanelProps): ReactElement {
    const seedAction = useAsyncAction(async function seedArticles(): Promise<SeedArticlesResponse> {
        const result = await runSeed();
        return result;
    });

    async function handleSeedClick(): Promise<void> {
        const result = await seedAction.run();

        if (result !== null) {
            props.onSeeded();
        }
    }

    return (
        <div className="panel">
            <h2>Seed sample articles</h2>
            <p className="muted">
                Loads the 20 articles from sample_articles.json. Re-seeding updates content
                columns but preserves existing enrichment data.
            </p>
            <ActionButton
                label={seedAction.isLoading ? "Seeding..." : "Run seed script"}
                onClick={function onSeedClick(): void {
                    void handleSeedClick();
                }}
                disabled={seedAction.isLoading}
            />
            {seedAction.data !== null ? (
                <StatusMessage
                    variant="success"
                    message={`Seeded ${seedAction.data.seeded} articles. Database now has ${seedAction.data.article_count} articles.`}
                />
            ) : null}
            {seedAction.error !== null ? (
                <StatusMessage variant="error" message={seedAction.error} />
            ) : null}
        </div>
    );
}
