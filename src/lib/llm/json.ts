import type { ZodType } from "zod";

export type ParseFailureReason = "empty" | "invalid_json" | "schema_mismatch";

export interface ParseFailure {
  ok: false;
  reason: ParseFailureReason;
  /** Human-readable, path-prefixed validation messages. Safe to show in dev error states. */
  issues: string[];
  raw: string;
}

export interface ParseSuccess<T> {
  ok: true;
  data: T;
  raw: string;
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/**
 * Pulls the first JSON object/array out of a model reply.
 *
 * Models often wrap JSON in markdown fences or add a sentence before/after it,
 * so we strip fences and slice from the first `{`/`[` to the last `}`/`]`.
 */
export function extractJson(raw: string): string | null {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return null;

  const unfenced = trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  const starts = [unfenced.indexOf("{"), unfenced.indexOf("[")].filter(
    (index) => index >= 0,
  );
  if (starts.length === 0) return null;

  const start = Math.min(...starts);
  const end = Math.max(unfenced.lastIndexOf("}"), unfenced.lastIndexOf("]"));
  if (end <= start) return null;

  return unfenced.slice(start, end + 1);
}

/** Parses model text as JSON, then validates it against a zod schema. */
export function parseJsonWithSchema<T>(
  raw: string,
  schema: ZodType<T, unknown>,
): ParseResult<T> {
  const candidate = extractJson(raw);
  if (!candidate) {
    return {
      ok: false,
      reason: "empty",
      issues: ["Response did not contain a JSON object or array."],
      raw,
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch (error) {
    return {
      ok: false,
      reason: "invalid_json",
      issues: [error instanceof Error ? error.message : "Invalid JSON."],
      raw,
    };
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      reason: "schema_mismatch",
      issues: result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      }),
      raw,
    };
  }

  return { ok: true, data: result.data, raw };
}
