import { describe, expect, it } from "vitest";
import { buildLlmConfig } from "./config";
import { LlmError } from "./core";
import { TASK_NAMES, TASK_TIER } from "../tasks";

const base = { LLM_API_KEY: "key-a", LLM_MODEL: "model-a", LLM_BASE_URL: "https://a.example/v1/" };

describe("buildLlmConfig", () => {
  it("uses the main settings, trims the base URL, and defaults to 0.7 and 25s", () => {
    expect(buildLlmConfig(base, "fast")).toMatchObject({
      apiKey: "key-a", model: "model-a", baseUrl: "https://a.example/v1", timeoutMs: 25_000, maxRetries: 1, temperature: 0.7,
    });
  });

  it("falls back to the main settings for the writing tier when nothing is overridden", () => {
    expect(buildLlmConfig(base, "writing")).toMatchObject({ apiKey: "key-a", model: "model-a", timeoutMs: 45_000 });
  });

  it("lets the writing tier use another provider, model, and effort without touching the fast tier", () => {
    const env = {
      ...base,
      LLM_WRITING_API_KEY: "key-b", LLM_WRITING_MODEL: "big-model", LLM_WRITING_BASE_URL: "https://b.example/v1",
      LLM_WRITING_REASONING_EFFORT: "high", LLM_WRITING_TIMEOUT_MS: "90000", LLM_REASONING_EFFORT: "low",
    };
    expect(buildLlmConfig(env, "writing")).toMatchObject({
      apiKey: "key-b", model: "big-model", baseUrl: "https://b.example/v1", reasoningEffort: "high", timeoutMs: 90_000,
    });
    expect(buildLlmConfig(env, "fast")).toMatchObject({ apiKey: "key-a", model: "model-a", reasoningEffort: "low", timeoutMs: 25_000 });
  });

  it("can omit temperature for models that only accept their default, per tier", () => {
    expect(buildLlmConfig({ ...base, LLM_TEMPERATURE: "default" }, "fast").temperature).toBeUndefined();
    expect(buildLlmConfig({ ...base, LLM_TEMPERATURE: "0.3" }, "fast").temperature).toBe(0.3);
    const env = { ...base, LLM_TEMPERATURE: "0.3", LLM_WRITING_TEMPERATURE: "none" };
    expect(buildLlmConfig(env, "writing").temperature).toBeUndefined();
    expect(buildLlmConfig(env, "fast").temperature).toBe(0.3);
  });

  it("names what is missing without printing any value, and rejects bad numbers", () => {
    expect(() => buildLlmConfig({ LLM_MODEL: "m" })).toThrow(/LLM_API_KEY/);
    try {
      buildLlmConfig({ LLM_API_KEY: "super-secret", LLM_TIMEOUT_MS: "abc", LLM_MODEL: "m" });
    } catch (error) {
      expect(error).toBeInstanceOf(LlmError);
      expect(String((error as Error).message)).not.toContain("super-secret");
      expect((error as Error).message).toContain("LLM_TIMEOUT_MS");
    }
    expect(() => buildLlmConfig({ ...base, LLM_REASONING_EFFORT: "extreme" })).toThrow(/low, medium, or high/);
  });
});

describe("task tiers", () => {
  it("assigns every task to a tier, with prose and structure on the writing tier", () => {
    expect(Object.keys(TASK_TIER).sort()).toEqual([...TASK_NAMES].sort());
    for (const name of ["storyline", "characters", "scenes", "writeScene", "polishScene", "nextLines", "shotList"] as const) {
      expect(TASK_TIER[name]).toBe("writing");
    }
    for (const name of ["translateScene", "translateStrings", "bibleSync", "storyboard"] as const) {
      expect(TASK_TIER[name]).toBe("fast");
    }
  });
});
