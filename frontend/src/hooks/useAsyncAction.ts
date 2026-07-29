"use strict";

import { useCallback, useState } from "react";

interface AsyncActionState<T> {
    isLoading: boolean;
    data: T | null;
    error: string | null;
}

interface UseAsyncActionResult<T> {
    data: T | null;
    error: string | null;
    isLoading: boolean;
    run: () => Promise<T | null>;
}

/**
 * Track loading, result, and error state for a one-shot async action.
 *
 * `run` resolves to `null` instead of rejecting so callers can branch on the
 * outcome without a second try/catch around the hook.
 */
export function useAsyncAction<T>(action: () => Promise<T>): UseAsyncActionResult<T> {
    const [state, setState] = useState<AsyncActionState<T>>({
        isLoading: false,
        data: null,
        error: null,
    });

    const run = useCallback(async function runAsyncAction(): Promise<T | null> {
        setState({
            isLoading: true,
            data: null,
            error: null,
        });

        try {
            const data = await action();
            setState({
                isLoading: false,
                data,
                error: null,
            });
            return data;
        } catch (error) {
            setState({
                isLoading: false,
                data: null,
                error: error instanceof Error ? error.message : "Unexpected error",
            });
            return null;
        }
    }, [action]);

    const result: UseAsyncActionResult<T> = {
        data: state.data,
        error: state.error,
        isLoading: state.isLoading,
        run,
    };

    return result;
}
