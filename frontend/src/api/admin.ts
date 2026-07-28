"use strict";

import type { SeedArticlesResponse } from "@carma/shared";

import { fetchJson } from "./client.ts";

/**
 * Run the sample article seed script via the admin API.
 */
export async function runSeed(): Promise<SeedArticlesResponse> {
    const result = await fetchJson<SeedArticlesResponse>({
        path: "/api/admin/seed",
        method: "POST",
    });

    return result;
}
