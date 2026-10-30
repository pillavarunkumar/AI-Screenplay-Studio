import { ApiError, callLlm, type LlmApiSuccess } from "./api-client";
import { shrinkRequestInput } from "./shrink-input";

// Generous on purpose: a whole-story run can hit the provider's per-minute token cap several times.
const MAX_RATE_LIMIT_WAITS = 10;
const MAX_AUTOMATIC_WAIT_SECONDS = 90;
/** Provider overloaded / briefly down (500, 502, 503, 504): wait 8s, 16s, 24s, then give up. */
const MAX_OVERLOAD_WAITS = 3;
const OVERLOAD_WAIT_SECONDS = 8;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RetryOptions {
  call?: typeof callLlm;
  wait?: (ms: number) => Promise<void>;
  onRateLimited?: (seconds: number) => void;
  /** Project language for prose output. */
  language?: string;
}

/**
 * `callLlm`, but when the rate limit trips it pauses for the advertised
 * retry-after (plus a second) and tries again, up to four times. Any other
 * error is thrown immediately.
 */
export async function callWithRateLimitRetry<T>(
  task: string,
  input: unknown,
  options: RetryOptions = {},
): Promise<LlmApiSuccess<T>> {
  const call = options.call ?? callLlm;
  const wait = options.wait ?? sleep;

  let body = input;
  let shrunk = false;
  let overloadWaits = 0;

  for (let waits = 0; ; waits += 1) {
    try {
      return await call<T>(task, body, options.language);
    } catch (error) {
      // Too big for the AI plan's per-request limit: try once more with older context trimmed.
      if (error instanceof ApiError && error.code === "llm_request_too_large" && !shrunk) {
        shrunk = true;
        body = shrinkRequestInput(body);
        waits -= 1;
        continue;
      }
      // "This model is experiencing high demand" and similar: temporary, so wait and try again.
      if (
        error instanceof ApiError &&
        error.code === "llm_upstream_error" &&
        [500, 502, 503, 504].includes(error.upstreamStatus ?? 0) &&
        overloadWaits < MAX_OVERLOAD_WAITS
      ) {
        overloadWaits += 1;
        const seconds = OVERLOAD_WAIT_SECONDS * overloadWaits;
        options.onRateLimited?.(seconds);
        await wait(seconds * 1000);
        waits -= 1;
        continue;
      }

      const rateLimited =
        error instanceof ApiError &&
        (error.code === "rate_limited" || error.code === "llm_rate_limited");
      if (!rateLimited || waits >= MAX_RATE_LIMIT_WAITS) throw error;

      // A long wait means a usage cap (per hour or day), not a burst. Tell the writer instead of hanging for minutes.
      if ((error.retryAfterSec ?? 0) > MAX_AUTOMATIC_WAIT_SECONDS) throw error;

      const seconds = Math.min(MAX_AUTOMATIC_WAIT_SECONDS, (error.retryAfterSec ?? 10) + 1);
      options.onRateLimited?.(seconds);
      await wait(seconds * 1000);
    }
  }
}
