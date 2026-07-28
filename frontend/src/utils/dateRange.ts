"use strict";

/**
 * Convert a date-picker value (YYYY-MM-DD) to an inclusive start-of-day ISO timestamp.
 */
export function toApiDateFrom(dateOnly: string): string {
    const iso = `${dateOnly}T00:00:00.000Z`;
    return iso;
}

/**
 * Convert a date-picker value (YYYY-MM-DD) to an inclusive end-of-day ISO timestamp.
 */
export function toApiDateTo(dateOnly: string): string {
    const iso = `${dateOnly}T23:59:59.999Z`;
    return iso;
}
