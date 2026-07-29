"use strict";

/**
 * Number of decimals used for per-article USD amounts, which are fractions of
 * a cent and would render as "$0.00" at currency precision.
 */
const MICRO_USD_DECIMALS = 6;

/**
 * Decimals for amounts displayed as ordinary currency.
 */
const USD_DECIMALS = 2;

/**
 * Length of the `YYYY-MM-DD` date portion of an ISO timestamp.
 */
const ISO_DATE_LENGTH = 10;

/**
 * Format an ISO timestamp as a calendar date (YYYY-MM-DD).
 *
 * Aggregate buckets are compared and grouped by period, so they are rendered in
 * UTC rather than the viewer's locale to keep a bucket label matching the
 * period the backend grouped by.
 */
export function formatIsoDate(value: string): string {
    const date = new Date(value);
    const formatted = date.toISOString().slice(0, ISO_DATE_LENGTH);
    return formatted;
}

/**
 * Format an ISO timestamp as a locale-aware date and time.
 */
export function formatTimestamp(value: string): string {
    const date = new Date(value);
    const formatted = date.toLocaleString();
    return formatted;
}

/**
 * Format a small USD amount with sub-cent precision.
 */
export function formatUsd(value: number): string {
    const formatted = `$${value.toFixed(MICRO_USD_DECIMALS)}`;
    return formatted;
}

/**
 * Format a USD amount at currency precision, for totals and projections large
 * enough that sub-cent digits are noise.
 */
export function formatUsdCoarse(value: number): string {
    const formatted = `$${value.toFixed(USD_DECIMALS)}`;
    return formatted;
}
