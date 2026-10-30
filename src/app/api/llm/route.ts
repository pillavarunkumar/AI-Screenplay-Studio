import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRuntimeEnv } from "@/lib/env";
import { callModelJson, LlmError } from "@/lib/llm";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { parseRetryAfterSeconds } from "@/lib/llm/retry-after";
import { isEnglish, languageDirective, normalizeLanguage } from "@/lib/language";
import { isTaskName, TASK_NAMES, TASK_TIER, TASKS } from "@/lib/tasks";

export const runtime = "nodejs";
// Two 25s attempts + overhead. Keep this under the platform's limit.
export const maxDuration = 120;

const MAX_BODY_BYTES = 32_000;

const runtimeEnv = getRuntimeEnv();
const limiter = createRateLimiter({
  limit: runtimeEnv.LLM_RATE_LIMIT,
  windowMs: runtimeEnv.LLM_RATE_WINDOW_MS,
});

const envelopeSchema = z.object({
  task: z.string().min(1),
  input: z.unknown(),
  /** Project language; prose output is written in it. */
  language: z.string().max(80).optional(),
});

function httpStatusFor(code: LlmError["code"]): number {
  switch (code) {
    case "not_configured":
      return 503;
    case "llm_timeout":
      return 504;
    case "llm_rate_limited":
      return 429;
    case "llm_request_too_large":
      return 413;
    case "llm_auth_failed":
      return 502;
    default:
      return 502;
  }
}

/** Turns a provider throttle into something a writer can act on. */
function friendlyMessage(error: LlmError): string {
  if (error.code !== "llm_rate_limited") return error.message;
  const seconds = parseRetryAfterSeconds(error.details);
  if (seconds === undefined) return error.message;
  if (seconds <= 90) return `The AI is busy. It will be ready again in about ${seconds} seconds.`;
  const minutes = Math.ceil(seconds / 60);
  return `The AI has reached its usage limit for now. It will be ready again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

function formatIssues(issues: z.ZodIssue[]): string[] {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}

/**
 * POST /api/llm
 * Body: { task: string, input: unknown }
 *
 * One route, many server-owned tasks. This keeps the prompt and output schema
 * on the server and gives every call the same timeout, validation, retry,
 * rate-limit, and error envelope.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = limiter.check(ip);
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(limit.limit),
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
  };

  const respond = (
    payload: unknown,
    status = 200,
    extraHeaders: Record<string, string> = {},
  ) =>
    NextResponse.json(payload, {
      status,
      headers: {
        ...rateHeaders,
        "cache-control": "no-store",
        ...extraHeaders,
      },
    });

  if (!limit.allowed) {
    return respond(
      {
        error: {
          code: "rate_limited",
          message: `Too many requests. Try again in ${limit.retryAfterSec}s.`,
          retryAfterSec: limit.retryAfterSec,
        },
      },
      429,
      { "Retry-After": String(limit.retryAfterSec) },
    );
  }

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return respond(
      { error: { code: "invalid_input", message: "Could not read request body." } },
      400,
    );
  }

  if (bodyText.length > MAX_BODY_BYTES) {
    return respond(
      {
        error: {
          code: "invalid_input",
          message: `Request body is too large (max ${MAX_BODY_BYTES} bytes).`,
        },
      },
      413,
    );
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    return respond(
      {
        error: {
          code: "invalid_input",
          message: "Request body must be valid JSON.",
        },
      },
      400,
    );
  }

  const envelope = envelopeSchema.safeParse(rawBody);
  if (!envelope.success) {
    return respond(
      {
        error: {
          code: "invalid_input",
          message: "Request must include a task name and an input object.",
          issues: formatIssues(envelope.error.issues),
        },
      },
      400,
    );
  }

  const taskName = envelope.data.task;
  if (!isTaskName(taskName)) {
    return respond(
      {
        error: {
          code: "invalid_input",
          message: `Unknown task "${taskName}". Available tasks: ${TASK_NAMES.join(", ")}.`,
        },
      },
      400,
    );
  }

  const task = TASKS[taskName];
  const parsedInput = task.input.safeParse(envelope.data.input);
  if (!parsedInput.success) {
    return respond(
      {
        error: {
          code: "invalid_input",
          message: "Input did not pass validation.",
          issues: formatIssues(parsedInput.error.issues),
        },
      },
      400,
    );
  }

  try {
    // translateScene/translateStrings carry their own target language.
    const language = normalizeLanguage(envelope.data.language);
    const useProjectLanguage =
      !isEnglish(language) && !taskName.startsWith("translate");

    const result = await callModelJson(task.output, {
      system: useProjectLanguage
        ? task.system + languageDirective(language)
        : task.system,
      user: task.buildUser(parsedInput.data),
      tier: TASK_TIER[taskName],
    });

    return respond({ data: result.data, meta: result.meta });
  } catch (error) {
    if (error instanceof LlmError) {
      return respond(
        {
          error: {
            code: error.code,
            message: friendlyMessage(error),
            attempts: error.attempts,
            // The provider's own HTTP status, so the app can tell "overloaded" (503) from "bad request" (400).
            upstreamStatus: error.status,
            issues: error.details,
            // Tells the app how long to pause when the AI provider is throttling us.
            retryAfterSec: error.code === "llm_rate_limited" ? parseRetryAfterSeconds(error.details) : undefined,
          },
        },
        httpStatusFor(error.code),
      );
    }

    console.error("[api/llm] unexpected error", error);
    return respond(
      {
        error: {
          code: "internal",
          message: "An unexpected server error occurred.",
        },
      },
      500,
    );
  }
}
