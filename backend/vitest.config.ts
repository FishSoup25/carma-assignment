import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: false,
        environment: "node",
        include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
        // Integration suites share one PostgreSQL database and mutate article
        // enrichment, which also rewrites search_vector. Running files in
        // parallel lets those writes race against other suites' assertions.
        fileParallelism: false,
    },
    resolve: {
        extensions: [".ts"],
    },
});
