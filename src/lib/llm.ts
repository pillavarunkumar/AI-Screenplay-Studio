import "server-only";
import type { ZodType } from "zod";
import { getLlmEnv } from "./env";
import type { LlmTier } from "./llm/config";
import { callLlmJson, type LlmCallResult } from "./llm/core";

export { LlmError } from "./llm/core";
export type {
  LlmCallMeta,
  LlmCallResult,
  LlmConfig,
  LlmErrorCode,
} from "./llm/core";

export interface CallModelOptions {
  system: string;
  user: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /** "writing" uses the stronger model when LLM_WRITING_* is set. */
  tier?: LlmTier;
}

/**
 * The only entry point app code should use to talk to the model.
 * Server-only: `env.ts` and this module must never be imported by a client component.
 */
export async function callModelJson<T>(
  schema: ZodType<T, unknown>,
  { system, user, fetchImpl, tier }: CallModelOptions,
): Promise<LlmCallResult<T>> {
  return callLlmJson({
    schema,
    system,
    user,
    config: getLlmEnv(tier),
    fetchImpl,
  });
}
