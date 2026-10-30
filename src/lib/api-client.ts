export type ApiErrorCode =
  | "invalid_input"
  | "rate_limited"
  | "not_configured"
  | "llm_timeout"
  | "llm_bad_json"
  | "llm_schema_mismatch"
  | "llm_upstream_error"
  | "llm_auth_failed"
  | "llm_request_too_large"
  | "llm_invalid_response"
  | "llm_rate_limited"
  | "network"
  | "internal";

export interface LlmApiMeta {
  model: string;
  attempts: number;
  latencyMs: number;
}

export interface LlmApiSuccess<T> {
  data: T;
  meta: LlmApiMeta;
}

interface ApiErrorBody {
  code?: string;
  message?: string;
  issues?: string[];
  retryAfterSec?: number;
  upstreamStatus?: number;
}

const KNOWN_CODES = new Set<string>([
  "invalid_input",
  "rate_limited",
  "not_configured",
  "llm_timeout",
  "llm_bad_json",
  "llm_schema_mismatch",
  "llm_upstream_error",
  "llm_auth_failed",
  "llm_request_too_large",
  "llm_invalid_response",
  "llm_rate_limited",
  "network",
  "internal",
]);

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly issues?: string[];
  readonly retryAfterSec?: number;
  /** The AI provider's own HTTP status when it caused the error (e.g. 503 = overloaded). */
  readonly upstreamStatus?: number;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    options: { issues?: string[]; retryAfterSec?: number; upstreamStatus?: number } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.issues = options.issues;
    this.retryAfterSec = options.retryAfterSec;
    this.upstreamStatus = options.upstreamStatus;
  }
}

function normalizeCode(value: string | undefined): ApiErrorCode {
  return value && KNOWN_CODES.has(value) ? (value as ApiErrorCode) : "internal";
}

/**
 * Typed client for POST /api/llm. Every failure becomes an ApiError with a
 * known code so the UI can show a specific, actionable error state.
 */
export async function callLlm<T>(
  task: string,
  input: unknown,
  language?: string,
): Promise<LlmApiSuccess<T>> {
  const controller = new AbortController();
  // Slightly above the server's two-attempt budget.
  const timer = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch("/api/llm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, input, language }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const error = (payload as { error?: ApiErrorBody } | null)?.error;
      throw new ApiError(
        normalizeCode(error?.code),
        error?.message ?? `Request failed with status ${response.status}.`,
        response.status,
        { issues: error?.issues, retryAfterSec: error?.retryAfterSec, upstreamStatus: error?.upstreamStatus },
      );
    }

    const success = payload as LlmApiSuccess<T> | null;
    if (!success?.data) {
      throw new ApiError(
        "internal",
        "The server returned an unexpected response.",
        response.status,
      );
    }

    return success;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (controller.signal.aborted) {
      throw new ApiError(
        "llm_timeout",
        "The request took too long and was cancelled.",
        504,
      );
    }

    throw new ApiError(
      "network",
      "Could not reach the server. Check your connection and try again.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}
