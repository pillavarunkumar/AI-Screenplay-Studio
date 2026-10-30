"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectLanguage } from "./language-context";
import {
  ApiError,
  callLlm,
  type LlmApiMeta,
  type LlmApiSuccess,
} from "./api-client";

export type LlmTaskState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T; meta: LlmApiMeta }
  | { status: "error"; error: ApiError };

/**
 * Shared call state for every AI action: idle → loading → success | error.
 * Errors are always an ApiError, so <ErrorState /> can explain and retry them.
 */
export function useLlmTask<T>(task: string) {
  const [state, setState] = useState<LlmTaskState<T>>({ status: "idle" });
  const mounted = useRef(true);
  const language = useProjectLanguage();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (input: unknown): Promise<LlmApiSuccess<T> | null> => {
      setState({ status: "loading" });
      try {
        const result = await callLlm<T>(task, input, language);
        if (mounted.current) setState({ status: "success", ...result });
        return result;
      } catch (error) {
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError("internal", "Something went wrong.", 500);
        if (mounted.current) setState({ status: "error", error: apiError });
        return null;
      }
    },
    [task, language],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, reset };
}

// Re-exported for convenience in components that only import the hook.
export type { LlmApiSuccess } from "./api-client";
