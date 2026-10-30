import { LlmError, type LlmConfig } from "./core";

/**
 * "writing" tasks (story, characters, scenes, scripts, polish, camera plans) are where
 * quality shows, so they can use a stronger model than "fast" tasks (notes, translation,
 * storyboards). Every writing setting falls back to the main one when unset.
 */
export type LlmTier = "writing" | "fast";

type Env = Record<string, string | undefined>;

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

function numberFrom(name: string, value: string | undefined, min: number, max: number): number | undefined {
  const text = clean(value);
  if (text === undefined) return undefined;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new LlmError("not_configured", `${name} must be a number between ${min} and ${max}.`);
  }
  return parsed;
}

function effortFrom(name: string, value: string | undefined): LlmConfig["reasoningEffort"] {
  const text = clean(value)?.toLowerCase();
  if (text === undefined) return undefined;
  if (text === "low" || text === "medium" || text === "high") return text;
  throw new LlmError("not_configured", `${name} must be low, medium, or high.`);
}

/** `LLM_TEMPERATURE=default` (or `none`) omits the setting for models that reject it; unset means 0.7. */
function temperatureFrom(name: string, value: string | undefined): number | undefined | "unset" {
  const text = clean(value)?.toLowerCase();
  if (text === undefined) return "unset";
  if (text === "default" || text === "none") return undefined;
  return numberFrom(name, text, 0, 2);
}

/** Builds the model settings for a tier from environment variables. Never reads or prints the key anywhere else. */
export function buildLlmConfig(env: Env, tier: LlmTier = "fast"): LlmConfig {
  const writing = tier === "writing";
  const pick = (name: string) => (writing ? clean(env[`LLM_WRITING_${name}`]) : undefined) ?? clean(env[`LLM_${name}`]);

  const apiKey = pick("API_KEY");
  const model = pick("MODEL");
  if (!apiKey || !model) {
    const missing = [!apiKey && "LLM_API_KEY", !model && "LLM_MODEL"].filter(Boolean).join(", ");
    throw new LlmError(
      "not_configured",
      `Missing server configuration: ${missing}. Copy .env.example to .env.local and set the values.`,
    );
  }

  const temperature = writing && clean(env.LLM_WRITING_TEMPERATURE) !== undefined
    ? temperatureFrom("LLM_WRITING_TEMPERATURE", env.LLM_WRITING_TEMPERATURE)
    : temperatureFrom("LLM_TEMPERATURE", env.LLM_TEMPERATURE);

  return {
    apiKey,
    model,
    baseUrl: (pick("BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
    // Flagship models can take longer to write a whole scene.
    timeoutMs:
      numberFrom("LLM_WRITING_TIMEOUT_MS", writing ? env.LLM_WRITING_TIMEOUT_MS : undefined, 1_000, 120_000) ??
      numberFrom("LLM_TIMEOUT_MS", env.LLM_TIMEOUT_MS, 1_000, 120_000) ??
      (writing ? 45_000 : 25_000),
    maxRetries: numberFrom("LLM_MAX_RETRIES", env.LLM_MAX_RETRIES, 0, 2) ?? 1,
    temperature: temperature === "unset" ? 0.7 : temperature,
    reasoningEffort: effortFrom(writing && clean(env.LLM_WRITING_REASONING_EFFORT) ? "LLM_WRITING_REASONING_EFFORT" : "LLM_REASONING_EFFORT", pick("REASONING_EFFORT")),
  };
}
