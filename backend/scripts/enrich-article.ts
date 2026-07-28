"use strict";

import dotenv from "dotenv";

import { closePool, getPool } from "../src/db/pool.js";
import { resetEnrichmentConfigCache } from "../src/enrichment/config.js";
import {
    buildDryRunEnrichmentMessages,
    executeArticleEnrichment,
} from "../src/enrichment/enrichment-service.js";
import { estimateTokenCount } from "../src/enrichment/guards.js";
import { getStaticMessagePrefix } from "../src/enrichment/prompt.js";

dotenv.config();

/**
 * Parsed CLI arguments for the enrich-article script.
 */
interface EnrichArticleCliArgs {
    articleId: number;
    force: boolean;
    dryRun: boolean;
}

/**
 * Print CLI usage instructions.
 */
function printUsage(): void {
    console.log("Usage: npm run enrich:article -- --id <articleId> [--force] [--dry-run]");
}

/**
 * Parse command-line arguments for article enrichment.
 */
function parseCliArgs(argv: string[]): EnrichArticleCliArgs {
    let articleId: number | null = null;
    let force = false;
    let dryRun = false;

    for (let index = 0; index < argv.length; index = index + 1) {
        const arg = argv[index];

        if (arg === "--id") {
            const nextValue = argv[index + 1];

            if (nextValue === undefined) {
                throw new Error("Missing value for --id");
            }

            articleId = Number(nextValue);
            index = index + 1;
            continue;
        }

        if (arg === "--force") {
            force = true;
            continue;
        }

        if (arg === "--dry-run") {
            dryRun = true;
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    if (articleId === null || !Number.isInteger(articleId) || articleId <= 0) {
        throw new Error("A positive integer --id is required");
    }

    const parsedArgs: EnrichArticleCliArgs = {
        articleId,
        force,
        dryRun,
    };

    return parsedArgs;
}

/**
 * Serialize messages for dry-run output.
 */
function serializeMessages(messages: Array<{ role: string; content: string }>): string {
    const serialized = JSON.stringify(messages, null, 2);
    return serialized;
}

/**
 * Run article enrichment from the CLI.
 */
async function runEnrichArticleCli(): Promise<void> {
    resetEnrichmentConfigCache();

    let parsedArgs: EnrichArticleCliArgs;

    try {
        parsedArgs = parseCliArgs(process.argv.slice(2));
    } catch (error) {
        printUsage();

        if (error instanceof Error) {
            throw error;
        }

        throw new Error("Failed to parse CLI arguments");
    }

    const pool = getPool();

    try {
        if (parsedArgs.dryRun) {
            const dryRunResult = await buildDryRunEnrichmentMessages(pool, parsedArgs.articleId);
            const prefix = getStaticMessagePrefix();
            const prefixText = serializeMessages(prefix);
            const messagesText = serializeMessages(dryRunResult.messages);
            const estimatedTokens = estimateTokenCount(messagesText);

            console.log("Dry run: no OpenRouter request was sent.");
            console.log(`Truncated input: ${dryRunResult.truncated ? "yes" : "no"}`);
            console.log(`Estimated tokens: ${estimatedTokens}`);
            console.log("Static prefix:");
            console.log(prefixText);
            console.log("Full message array:");
            console.log(messagesText);
            return;
        }

        const enrichmentResult = await executeArticleEnrichment(pool, {
            articleId: parsedArgs.articleId,
            force: parsedArgs.force,
        });

        console.log(`Article ${enrichmentResult.article.id} enrichment ${enrichmentResult.cached ? "cached" : "completed"}.`);
        console.log(`Summary: ${enrichmentResult.enrichment.summary}`);
        console.log(`Sentiment: ${enrichmentResult.enrichment.sentiment}`);
        console.log(`Topic tags: ${enrichmentResult.enrichment.topic_tags.join(", ")}`);
        console.log(`Model: ${enrichmentResult.enrichment.model_handle}`);
        console.log(`Prompt tokens: ${enrichmentResult.usage.prompt_tokens}`);
        console.log(`Completion tokens: ${enrichmentResult.usage.completion_tokens}`);
        console.log(`Cost USD: ${enrichmentResult.usage.cost_usd.toFixed(6)}`);
        console.log(`Truncated input: ${enrichmentResult.truncated ? "yes" : "no"}`);
    } finally {
        await closePool();
    }
}

try {
    await runEnrichArticleCli();
} catch (error) {
    console.error("Failed to enrich article:", error);
    process.exit(1);
}
