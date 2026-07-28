"use strict";

import { useCallback, useState } from "react";

import { ApiRequestError } from "../api/client.ts";

type AsyncStatus = "idle" | "loading" | "error" | "success";

interface AsyncActionState<T> {
    status: AsyncStatus;
    data: T | null;
    error: string | null;
    errorCode: string | null;
}

interface UseAsyncActionResult<T, TArgs extends unknown[]> {
    status: AsyncStatus;
    data: T | null;
    error: string | null;
    errorCode: string | null;
    isLoading: boolean;
    run: (...args: TArgs) => Promise<T | null>;
    reset: () => void;
}

/**
 * Track idle/loading/error/success state for an async mutation.
 */
export function useAsyncAction<T, TArgs extends unknown[]>(
    action: (...args: TArgs) => Promise<T>,
): UseAsyncActionResult<T, TArgs> {
    const [state, setState] = useState<AsyncActionState<T>>({
        status: "idle",
        data: null,
        error: null,
        errorCode: null,
    });

    const reset = useCallback(function resetAsyncAction(): void {
        setState({
            status: "idle",
            data: null,
            error: null,
            errorCode: null,
        });
    }, []);

    const run = useCallback(async function runAsyncAction(...args: TArgs): Promise<T | null> {
        setState({
            status: "loading",
            data: null,
            error: null,
            errorCode: null,
        });

        try {
            const data = await action(...args);
            setState({
                status: "success",
                data,
                error: null,
                errorCode: null,
            });
            return data;
        } catch (error) {
            let message = "Unexpected error";
            let code: string | null = null;

            if (error instanceof ApiRequestError) {
                message = error.message;
                code = error.code;
            } else if (error instanceof Error) {
                message = error.message;
            }

            setState({
                status: "error",
                data: null,
                error: message,
                errorCode: code,
            });
            return null;
        }
    }, [action]);

    const result: UseAsyncActionResult<T, TArgs> = {
        status: state.status,
        data: state.data,
        error: state.error,
        errorCode: state.errorCode,
        isLoading: state.status === "loading",
        run,
        reset,
    };

    return result;
}
