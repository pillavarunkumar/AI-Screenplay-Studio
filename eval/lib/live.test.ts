import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NextLinesOutputSchema,
  ShotListOutputSchema,
} from "../../src/lib/schemas/scene";
import { LiveEvalError, LiveProvider } from "./live";
import { loadSamples } from "./samples";
import { StubProvider } from "./stub";

const sample = loadSamples()[0];
const stub = new StubProvider();

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("LiveProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("posts the server-owned task and validates the API envelope", async () => {
    const requests: Array<{ task: string; input: unknown }> = [];
    const stubNextLines = await stub.runNextLines(sample);
    const stubShotList = await stub.runShotList(sample);

    const provider = new LiveProvider({
      apiUrl: "http://test.local/api/llm",
      fetchImpl: async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as {
          task: string;
          input: unknown;
        };
        requests.push(body);

        const data =
          body.task === "nextLines"
            ? NextLinesOutputSchema.parse(stubNextLines)
            : ShotListOutputSchema.parse(stubShotList);

        return jsonResponse({ data, meta: { model: "test-model", attempts: 1 } });
      },
    });

    const nextLines = await provider.runNextLines(sample);
    const shotList = await provider.runShotList(sample);

    expect(NextLinesOutputSchema.safeParse(nextLines).success).toBe(true);
    expect(ShotListOutputSchema.safeParse(shotList).success).toBe(true);
    expect(requests.map((request) => request.task)).toEqual([
      "nextLines",
      "shotList",
    ]);
    expect(provider.model).toBe("test-model");

    const input = requests[0].input as {
      correctedIdea: string;
      bible: unknown;
      scene: unknown;
    };
    expect(input.correctedIdea).toBe(sample.correctedIdea);
    expect(input.bible).toEqual(sample.bible);
    expect(input.scene).toEqual(sample.scene);
  });

  it("uses EVAL_API_URL when no endpoint is passed explicitly", async () => {
    vi.stubEnv("EVAL_API_URL", "http://env.local/api/llm");
    const stubNextLines = await stub.runNextLines(sample);
    let requestedUrl = "";

    const provider = new LiveProvider({
      fetchImpl: async (input) => {
        requestedUrl = String(input);
        return jsonResponse({
          data: stubNextLines,
          meta: { model: "env-model" },
        });
      },
    });

    await provider.runNextLines(sample);

    expect(requestedUrl).toBe("http://env.local/api/llm");
    expect(provider.model).toBe("env-model");
  });

  it("surfaces API errors with the task name", async () => {
    const provider = new LiveProvider({
      fetchImpl: async () =>
        jsonResponse(
          { error: { code: "llm_timeout", message: "The model timed out." } },
          504,
        ),
    });

    await expect(provider.runNextLines(sample)).rejects.toThrow(
      "nextLines failed (504): The model timed out.",
    );
  });

  it("rejects a schema-invalid model response", async () => {
    const provider = new LiveProvider({
      fetchImpl: async () =>
        jsonResponse({ data: { suggestions: [] }, meta: { model: "m" } }),
    });

    await expect(provider.runNextLines(sample)).rejects.toBeInstanceOf(
      LiveEvalError,
    );
  });

  it("reports a timeout when the request does not settle", async () => {
    const provider = new LiveProvider({
      timeoutMs: 5,
      fetchImpl: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
    });

    await expect(provider.runShotList(sample)).rejects.toThrow(
      "shotList timed out after 5ms",
    );
  });
});
