import { z } from "zod";
import {
  NextLinesOutputSchema,
  ShotListOutputSchema,
  type NextLinesOutput,
  type ShotListOutput,
} from "../../src/lib/schemas/scene";
import type { EvalProvider } from "./provider";
import type { EvalSample } from "./samples";

export const DEFAULT_EVAL_API_URL = "http://127.0.0.1:3000/api/llm";
const DEFAULT_TIMEOUT_MS = 60_000;

const envelopeSchema = z.object({
  data: z.unknown(),
  meta: z
    .object({
      model: z.string().optional(),
      attempts: z.number().optional(),
      latencyMs: z.number().optional(),
    })
    .passthrough()
    .optional(),
});

type FetchLike = typeof fetch;

export class LiveEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveEvalError";
  }
}

interface LiveProviderOptions {
  apiUrl?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

/**
 * Calls the running app's `/api/llm` route. This exercises the real prompt,
 * timeout/retry pipeline, and server-side zod validation rather than importing
 * the model client into the eval process.
 */
export class LiveProvider implements EvalProvider {
  readonly name = "live";
  model?: string;

  private readonly apiUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: LiveProviderOptions = {}) {
    this.apiUrl =
      options.apiUrl ?? process.env.EVAL_API_URL ?? DEFAULT_EVAL_API_URL;
    const envTimeout = Number(process.env.EVAL_TIMEOUT_MS);
    this.timeoutMs =
      options.timeoutMs ??
      (Number.isFinite(envTimeout) && envTimeout > 0
        ? envTimeout
        : DEFAULT_TIMEOUT_MS);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async runNextLines(sample: EvalSample): Promise<NextLinesOutput> {
    return this.call("nextLines", sample, NextLinesOutputSchema);
  }

  async runShotList(sample: EvalSample): Promise<ShotListOutput> {
    return this.call("shotList", sample, ShotListOutputSchema);
  }

  private async call<T>(
    task: "nextLines" | "shotList",
    sample: EvalSample,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task,
          input: {
            correctedIdea: sample.correctedIdea,
            synopsis: sample.synopsis,
            bible: sample.bible,
            scene: sample.scene,
          },
        }),
        signal: controller.signal,
      });

      const text = await response.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new LiveEvalError(
          `${task} returned non-JSON (${response.status}): ${text.slice(0, 200)}`,
        );
      }

      if (!response.ok) {
        const message = (payload as { error?: { message?: string } } | null)
          ?.error?.message;
        throw new LiveEvalError(
          `${task} failed (${response.status}): ${message ?? text.slice(0, 200)}`,
        );
      }

      const envelope = envelopeSchema.safeParse(payload);
      if (!envelope.success) {
        throw new LiveEvalError(
          `${task} response did not match the API envelope: ${envelope.error.message}`,
        );
      }

      if (!this.model && envelope.data.meta?.model) {
        this.model = envelope.data.meta.model;
      }

      const parsed = schema.safeParse(envelope.data.data);
      if (!parsed.success) {
        throw new LiveEvalError(
          `${task} response did not match the task schema: ${parsed.error.message}`,
        );
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof LiveEvalError) throw error;
      if (controller.signal.aborted) {
        throw new LiveEvalError(
          `${task} timed out after ${this.timeoutMs}ms at ${this.apiUrl}.`,
        );
      }
      throw new LiveEvalError(
        `${task} request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
