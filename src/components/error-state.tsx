import type { ApiError, ApiErrorCode } from "@/lib/api-client";

interface ErrorCopy {
  title: string;
  hint: string;
  retryable: boolean;
}

/**
 * Exhaustive map: adding a new ApiErrorCode will fail typechecking until it has
 * a clear, human explanation here.
 */
const COPY: Record<ApiErrorCode, ErrorCopy> = {
  invalid_input: {
    title: "That needs a small change",
    hint: "Please check what you entered and try again.",
    retryable: false,
  },
  rate_limited: {
    title: "Please wait a moment",
    hint: "You've sent a lot of requests quickly. Wait a few seconds, then try again.",
    retryable: true,
  },
  not_configured: {
    title: "The AI isn't connected yet",
    hint: "Nothing you wrote is lost. The site owner needs to add LLM_API_KEY and LLM_MODEL to .env.local and restart the server.",
    retryable: false,
  },
  llm_timeout: {
    title: "The AI is taking too long",
    hint: "It may be busy. Your text is safe, so try again in a moment.",
    retryable: true,
  },
  llm_bad_json: {
    title: "The AI's answer didn't come out right",
    hint: "This sometimes happens. Please try again. A slightly clearer idea can also help.",
    retryable: true,
  },
  llm_schema_mismatch: {
    title: "The AI's answer was incomplete",
    hint: "Please try again. If it keeps happening, let us know.",
    retryable: true,
  },
  llm_auth_failed: {
    title: "The AI key was rejected",
    hint: "The site owner needs to check that LLM_API_KEY, LLM_BASE_URL and LLM_MODEL in .env.local all belong to the same provider, then restart the server. Nothing you wrote is lost.",
    retryable: false,
  },
  llm_request_too_large: {
    title: "That was too much for the AI at once",
    hint: "Your AI plan limits how much it can read in one go. Try again; the app sends a smaller version. If it keeps happening, the plan's limit is too low for this step.",
    retryable: true,
  },
  llm_upstream_error: {
    title: "The AI service is having trouble",
    hint: "This usually fixes itself. Try again in a moment.",
    retryable: true,
  },
  llm_invalid_response: {
    title: "The AI sent back nothing",
    hint: "Please try again. If it keeps happening, let us know.",
    retryable: true,
  },
  llm_rate_limited: {
    title: "The AI is busy right now",
    hint: "There are too many requests at once. Wait a little, then try again.",
    retryable: true,
  },
  network: {
    title: "Can't reach the server",
    hint: "Check your internet connection and try again. Nothing you wrote is lost.",
    retryable: true,
  },
  internal: {
    title: "Something went wrong on our side",
    hint: "Please try once more. If it keeps happening, let us know.",
    retryable: true,
  },
};

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry?: () => void;
}) {
  const copy = COPY[error.code];

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 text-base">
          ⚠
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{copy.title}</p>
          <p className="mt-1 text-red-800">{error.message}</p>
          <p className="mt-2 text-red-700">{copy.hint}</p>

          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-red-800">Technical details</summary>
            <p className="mt-2 font-mono text-xs text-red-700">{error.code}</p>
            {error.issues && error.issues.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs">
                {error.issues.map((issue, index) => (
                  <li key={`${issue}-${index}`}>{issue}</li>
                ))}
              </ul>
            ) : null}
          </details>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {copy.retryable && onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 focus-visible:ring-offset-red-50"
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
