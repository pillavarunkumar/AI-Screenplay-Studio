import type { ZodType } from "zod";
import { parseJsonWithSchema, type ParseFailure } from "./json";

export type LlmErrorCode =
  | "not_configured"
  | "llm_timeout"
  | "llm_bad_json"
  | "llm_schema_mismatch"
  | "llm_rate_limited"
  | "llm_auth_failed"
  | "llm_request_too_large"
  | "llm_upstream_error"
  | "llm_invalid_response";

export class LlmError extends Error {
  readonly code: LlmErrorCode;
  readonly status?: number;
  readonly details?: string[];
  readonly attempts?: number;

  constructor(
    code: LlmErrorCode,
    message: string,
    options: {
      status?: number;
      details?: string[];
      attempts?: number;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "LlmError";
    this.code = code;
    this.status = options.status;
    this.details = options.details;
    this.attempts = options.attempts;
  }
}

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Per-attempt timeout. The route allows two attempts, so keep this well under the route budget. */
  timeoutMs: number;
  maxRetries: number;
  /** Omitted from the request when undefined (some models only accept their default). */
  temperature?: number;
  /** For reasoning models (e.g. gpt-oss): "low" uses far fewer tokens. Omitted unless set. */
  reasoningEffort?: "low" | "medium" | "high";
}

export interface LlmCallMeta {
  model: string;
  attempts: number;
  latencyMs: number;
}

export interface LlmCallResult<T> {
  data: T;
  meta: LlmCallMeta;
}

export interface CallLlmArgs<T> {
  schema: ZodType<T, unknown>;
  system: string;
  user: string;
  config: LlmConfig;
  /** Injectable for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests so retries don't actually wait. */
  sleepImpl?: (ms: number) => Promise<void>;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionBody {
  choices?: Array<{ message?: { content?: unknown } }>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function chatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;
}

function truncate(value: string, max = 500): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function isRetryable(error: LlmError): boolean {
  switch (error.code) {
    case "llm_timeout":
    case "llm_invalid_response":
      return true;
    case "llm_rate_limited":
      return true;
    case "llm_upstream_error":
      return (
        error.status === undefined ||
        error.status === 408 ||
        error.status === 429 ||
        error.status >= 500
      );
    default:
      return false;
  }
}

const MAX_ECHOED_REPLY_CHARS = 2_500;

const SHORT_REPAIR = [
  "Your previous reply could not be parsed as JSON (it may have been empty or cut off).",
  "Reply again with ONLY the complete JSON object. Keep the text inside it concise.",
  "No markdown fences, no commentary, no trailing commas.",
].join("\n");

function repairMessage(failure: ParseFailure): string {
  return [
    "Your previous reply could not be used.",
    `Reason: ${failure.reason}.`,
    "Validation issues:",
    ...failure.issues.map((issue) => `- ${issue}`),
    "Return ONLY a single valid JSON value matching the required shape.",
    "No markdown fences, no commentary, no trailing commas.",
  ].join("\n");
}

async function requestOnce(
  messages: ChatMessage[],
  config: LlmConfig,
  fetchImpl: typeof fetch,
  attempt: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(chatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
        response_format: { type: "json_object" },
        ...(config.reasoningEffort ? { reasoning_effort: config.reasoningEffort } : {}),
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      // Providers that run "JSON mode" server-side reject a reply that isn't valid JSON (or is
      // empty because the model spent its whole budget thinking) with a 400. That's the model's
      // mistake, not a bad request, so it is retried like any other unusable reply.
      const badJson = response.status === 400 && /json_validate_failed|failed to (generate|validate) json/i.test(body);
      const tooLarge = response.status === 413;
      const authFailed = response.status === 401 || response.status === 403;
      throw new LlmError(
        response.status === 429
          ? "llm_rate_limited"
          : authFailed
            ? "llm_auth_failed"
            : tooLarge
            ? "llm_request_too_large"
            : badJson
              ? "llm_bad_json"
              : "llm_upstream_error",
        response.status === 429
          ? "The model provider's rate limit was reached."
          : authFailed
            ? "The AI provider rejected the API key."
            : tooLarge
            ? "The request was too large for the AI plan's per-request limit."
            : badJson
              ? "The model's reply was not valid JSON."
              : `The model provider returned HTTP ${response.status}.`,
        {
          status: response.status,
          details: body ? [truncate(body)] : undefined,
          attempts: attempt,
        },
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new LlmError(
        "llm_invalid_response",
        "The model provider returned a non-JSON HTTP body.",
        { attempts: attempt, cause: error },
      );
    }

    const content = (payload as ChatCompletionBody)?.choices?.[0]?.message
      ?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new LlmError(
        "llm_invalid_response",
        "The model provider returned an empty message.",
        { attempts: attempt },
      );
    }

    return content;
  } catch (error) {
    if (error instanceof LlmError) throw error;

    if (controller.signal.aborted) {
      throw new LlmError(
        "llm_timeout",
        `The model call timed out after ${config.timeoutMs}ms.`,
        { attempts: attempt, cause: error },
      );
    }

    throw new LlmError(
      "llm_upstream_error",
      "Could not reach the model provider.",
      { attempts: attempt, cause: error },
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls an OpenAI-compatible chat completions endpoint and guarantees the
 * returned value matches `schema`.
 *
 * - 25s per attempt (or `config.timeoutMs`)
 * - one retry by default (`config.maxRetries`)
 * - malformed JSON / schema mismatches are retried with the validation errors
 *   appended, so the model can repair its own reply
 *
 * Throws `LlmError` when both attempts fail.
 */
export async function callLlmJson<T>({
  schema,
  system,
  user,
  config,
  fetchImpl = fetch,
  sleepImpl = defaultSleep,
}: CallLlmArgs<T>): Promise<LlmCallResult<T>> {
  const startedAt = Date.now();
  let messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  let attempts = 0;
  let lastError: LlmError | null = null;

  while (attempts <= config.maxRetries) {
    attempts += 1;

    let raw: string;
    try {
      raw = await requestOnce(messages, config, fetchImpl, attempts);
    } catch (error) {
      const llmError =
        error instanceof LlmError
          ? error
          : new LlmError("llm_upstream_error", "Unknown model error.", {
              attempts,
              cause: error,
            });
      lastError = llmError;

      if (attempts <= config.maxRetries && isRetryable(llmError)) {
        // An overloaded provider (5xx) needs real breathing room; other retryable errors are quick.
        await sleepImpl((llmError.status ?? 0) >= 500 ? 1_500 * attempts : 250 * attempts);
        continue;
      }
      // The provider rejected an unusable reply outright: ask again, briefly and without resending it.
      if (llmError.code === "llm_bad_json" && attempts <= config.maxRetries) {
        messages = [...messages, { role: "user", content: SHORT_REPAIR }];
        continue;
      }
      throw llmError;
    }

    const parsed = parseJsonWithSchema(raw, schema);
    if (parsed.ok) {
      return {
        data: parsed.data,
        meta: {
          model: config.model,
          attempts,
          latencyMs: Date.now() - startedAt,
        },
      };
    }

    lastError = new LlmError(
      parsed.reason === "schema_mismatch"
        ? "llm_schema_mismatch"
        : "llm_bad_json",
      parsed.reason === "schema_mismatch"
        ? "The model's reply did not match the expected schema."
        : "The model's reply was not valid JSON.",
      { details: parsed.issues, attempts },
    );

    if (attempts <= config.maxRetries) {
      // A long reply sent back doubles the request and can cross a plan's per-request token cap
      // (HTTP 413), so past a size limit only the issues are sent and the model starts over.
      messages = [
        ...messages,
        ...(raw.length <= MAX_ECHOED_REPLY_CHARS ? [{ role: "assistant" as const, content: raw }] : []),
        { role: "user", content: repairMessage(parsed) },
      ];
      continue;
    }
  }

  throw (
    lastError ??
    new LlmError("llm_bad_json", "The model did not return valid JSON.", {
      attempts,
    })
  );
}
