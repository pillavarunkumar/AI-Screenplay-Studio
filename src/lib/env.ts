import "server-only";
import { z } from "zod";
import { buildLlmConfig, type LlmTier } from "./llm/config";
import type { LlmConfig } from "./llm/core";

/** Empty env vars should fall back to defaults, not coerce to 0. */
const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const runtimeEnvSchema = z.object({
  LLM_BASE_URL: z
    .preprocess(emptyToUndefined, z.string().url())
    .default("https://api.openai.com/v1"),
  LLM_TIMEOUT_MS: z
    .preprocess(emptyToUndefined, z.coerce.number().int().positive().max(120_000))
    .default(25_000),
  LLM_MAX_RETRIES: z
    .preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(2))
    .default(1),
  LLM_RATE_LIMIT: z
    .preprocess(emptyToUndefined, z.coerce.number().int().positive().max(1_000))
    .default(30),
  LLM_REASONING_EFFORT: z.preprocess(emptyToUndefined, z.enum(["low", "medium", "high"]).optional()),
  LLM_RATE_WINDOW_MS: z
    .preprocess(emptyToUndefined, z.coerce.number().int().min(1_000))
    .default(60_000),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

let cachedRuntime: RuntimeEnv | null = null;

/**
 * Optional knobs with defaults. Safe to call at module scope — it never throws,
 * so builds work without secrets present.
 */
export function getRuntimeEnv(): RuntimeEnv {
  if (!cachedRuntime) {
    cachedRuntime = runtimeEnvSchema.parse(process.env);
  }
  return cachedRuntime;
}

/**
 * Full model config for a tier. Throws `LlmError("not_configured")` with the missing
 * variable names (never their values) when the server is not set up.
 */
export function getLlmEnv(tier: LlmTier = "fast"): LlmConfig {
  return buildLlmConfig(process.env, tier);
}
