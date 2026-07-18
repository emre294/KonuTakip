/**
 * useAI — base hook for making AI requests with full loading/error state.
 *
 * All feature-specific hooks (useQuestionGenerator, useAITeacher, etc.) are
 * built on top of this hook. Call-sites should prefer the specific hooks.
 *
 * Usage:
 *   const { execute, status, data, error, reset } = useAI<
 *     QuestionGenerationRequest,
 *     QuestionGenerationResponse
 *   >(AIManager.generateQuestions.bind(AIManager));
 *
 *   // Trigger a request:
 *   await execute(myRequest);
 */

import { useCallback, useRef, useState } from "react";
import type { AIState, AIStatus } from "@/utils/ai/types";
import { AIError } from "@/utils/ai/AIError";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseAIResult<TRequest, TResponse> {
  /** Current status of the AI request */
  status: AIStatus;
  /** Shorthand booleans derived from status */
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** The last successful response, or null */
  data: TResponse | null;
  /** The last error (always an AIError), or null */
  error: AIError | null;
  /** Human-readable Turkish error message — ready for UI display */
  errorMessage: string | null;
  /** ISO timestamp of the last successful response */
  lastSuccessAt: string | null;
  /**
   * Execute the AI request.
   * Returns the response on success.
   * Throws an AIError on failure (also stored in `error`).
   */
  execute: (request: TRequest) => Promise<TResponse>;
  /** Reset state back to idle */
  reset: () => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

function makeInitial<T>(): AIState<T> {
  return { status: "idle", data: null, error: null, lastSuccessAt: null };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAI<TRequest, TResponse>(
  fn: (req: TRequest) => Promise<TResponse>
): UseAIResult<TRequest, TResponse> {
  const [state, setState] = useState<AIState<TResponse>>(makeInitial<TResponse>);

  // Keep a stable ref to fn so callers can pass inline arrow functions without
  // causing the execute callback to be recreated every render.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // Track in-flight requests so rapid taps don't produce race conditions.
  const inflightRef = useRef<symbol | null>(null);

  const execute = useCallback(async (request: TRequest): Promise<TResponse> => {
    const requestSymbol = Symbol();
    inflightRef.current = requestSymbol;

    setState((prev) => ({ ...prev, status: "loading", error: null }));

    try {
      const response = await fnRef.current(request);

      // Only update state if this is still the latest request.
      if (inflightRef.current === requestSymbol) {
        setState({
          status: "success",
          data: response,
          error: null,
          lastSuccessAt: new Date().toISOString(),
        });
      }

      return response;
    } catch (e) {
      const aiError = e instanceof AIError ? e : AIError.unknown(e);

      if (inflightRef.current === requestSymbol) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: aiError,
        }));
      }

      throw aiError;
    }
  }, []);

  const reset = useCallback(() => {
    inflightRef.current = null;
    setState(makeInitial<TResponse>());
  }, []);

  return {
    status: state.status,
    isIdle: state.status === "idle",
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    data: state.data,
    error: state.error,
    errorMessage: state.error?.toUserMessage() ?? null,
    lastSuccessAt: state.lastSuccessAt,
    execute,
    reset,
  };
}
