"use strict";

import { useState, type ReactElement } from "react";

import { AppShell } from "./components/layout/AppShell.tsx";
import { AggregatePage } from "./pages/AggregatePage.tsx";
import { ArticlesPage } from "./pages/ArticlesPage.tsx";
import { CostPage } from "./pages/CostPage.tsx";
import { SearchPage } from "./pages/SearchPage.tsx";
import type { TabId } from "./types/view.ts";

const APP_TABS = [
    { id: "articles" as const, label: "Articles" },
    { id: "search" as const, label: "Search" },
    { id: "aggregate" as const, label: "Aggregate" },
    { id: "cost" as const, label: "Cost" },
];

/**
 * Root application component with tabbed wireframe UI.
 */
function App(): ReactElement {
    const [activeTab, setActiveTab] = useState<TabId>("articles");
    const title = import.meta.env.VITE_APP_TITLE ?? "CARMA Media Signal Service";

    let page: ReactElement;

    if (activeTab === "search") {
        page = <SearchPage />;
    } else if (activeTab === "aggregate") {
        page = <AggregatePage />;
    } else if (activeTab === "cost") {
        page = <CostPage />;
    } else {
        page = <ArticlesPage />;
    }

    return (
        <AppShell
            title={title}
            subtitle="Browse, search, enrich, and estimate cost for media articles."
            activeTab={activeTab}
            tabs={APP_TABS}
            onTabChange={setActiveTab}
        >
            {page}
        </AppShell>
    );
}

export default App;
