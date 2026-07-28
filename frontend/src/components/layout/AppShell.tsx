"use strict";

import type { ReactElement, ReactNode } from "react";

import type { TabId } from "../../types/view.ts";

interface TabDefinition {
    id: TabId;
    label: string;
}

interface TabNavProps {
    activeTab: TabId;
    tabs: TabDefinition[];
    onChange: (tabId: TabId) => void;
}

/**
 * Horizontal tab navigation for the main app shell.
 */
export function TabNav(props: TabNavProps): ReactElement {
    return (
        <ul className="tab-nav" role="tablist">
            {props.tabs.map(function renderTab(tab): ReactElement {
                const isActive = tab.id === props.activeTab;

                return (
                    <li key={tab.id} role="presentation">
                        <button
                            type="button"
                            role="tab"
                            aria-current={isActive ? "page" : undefined}
                            onClick={function handleTabClick(): void {
                                props.onChange(tab.id);
                            }}
                        >
                            {tab.label}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

interface AppShellProps {
    title: string;
    subtitle: string;
    activeTab: TabId;
    tabs: TabDefinition[];
    onTabChange: (tabId: TabId) => void;
    children: ReactNode;
}

/**
 * Application shell with header and tab navigation.
 */
export function AppShell(props: AppShellProps): ReactElement {
    return (
        <div className="app-shell">
            <header className="app-header">
                <h1>{props.title}</h1>
                <p>{props.subtitle}</p>
            </header>
            <TabNav
                activeTab={props.activeTab}
                tabs={props.tabs}
                onChange={props.onTabChange}
            />
            <main>{props.children}</main>
        </div>
    );
}
