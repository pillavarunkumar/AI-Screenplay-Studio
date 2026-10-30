import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callLlmJson, LlmError, type LlmConfig } from "./core";

const schema = z.object({ title: z.string(), score: z.number() });

const config: LlmConfig = {
  apiKey: "test-key",
  baseUrl: "https://example.test/v1",
  model: "test-model",
  timeoutMs: 1_000,
  maxRetries: 1,
  temperature: 0.2,
};

const sleepImpl = async () => {};

function completion(content: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content:
              typeof content === "string" ? content : JSON.stringify(content),
          },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function callsOf(fetchMock: { mock: { calls: unknown[][] } }) {
  return fetchMock.mock.calls as unknown as Array<
    [RequestInfo | URL, RequestInit?]
  >;
}

function requestBody(
  fetchMock: { mock: { calls: unknown[][] } },
  call = 0,
) {
  const init = callsOf(fetchMock)[call]?.[1];
  return JSON.parse(String(init?.body)) as {
    model: string;
    response_format: { type: string };
    messages: Array<{ role: string; content: string }>;
  };
}

describe("callLlmJson", () => {
  it("returns validated data and sends a JSON-mode request", async () => {
    const fetchMock = vi.fn(async () => completion({ title: "A", score: 2 }));

    const result = await callLlmJson({
      schema,
      system: "system prompt",
      user: "user prompt",
      config,
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl,
    });

    expect(result.data).toEqual({ title: "A", score: 2 });
    expect(result.meta).toMatchObject({ model: "test-model", attempts: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callsOf(fetchMock)[0]?.[0]).toBe(
      "https://example.test/v1/chat/completions",
    );

    const body = requestBody(fetchMock);
    expect(body.model).toBe("test-model");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "system prompt",
    });
  });

  it("retries once with repair feedback when JSON is malformed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion("```json\n{ not json }\n```"))
      .mockResolvedValueOnce(completion({ title: "B", score: 4 }));

    const result = await callLlmJson({
      schema,
      system: "system prompt",
      user: "user prompt",
      config,
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl,
    });

    expect(result.data).toEqual({ title: "B", score: 4 });
    expect(result.meta.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const secondRequest = requestBody(fetchMock, 1);
    expect(secondRequest.messages).toHaveLength(4);
    expect(secondRequest.messages[2]).toMatchObject({
      role: "assistant",
      content: "```json\n{ not json }\n```",
    });
    expect(secondRequest.messages[3]?.content).toContain(
      "previous reply could not be used",
    );
  });

  it("retries on schema mismatch and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion({ title: "A" }))
      .mockResolvedValueOnce(completion({ title: "A", score: 1 }));

    const result = await callLlmJson({
      schema,
      system: "s",
      user: "u",
      config,
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl,
    });

    expect(result.data.score).toBe(1);
    expect(result.meta.attempts).toBe(2);

    const repair = requestBody(fetchMock, 1).messages[3]?.content;
    expect(repair).toContain("score: Invalid input: expected number, received undefined");
  });

  it("throws llm_schema_mismatch after both attempts fail validation", async () => {
    const fetchMock = vi.fn(async () => completion({ title: "A" }));

    await expect(
      callLlmJson({
        schema,
        system: "s",
        user: "u",
        config,
        fetchImpl: fetchMock as unknown as typeof fetch,
        sleepImpl,
      }),
    ).rejects.toMatchObject({
      code: "llm_schema_mismatch",
      attempts: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws llm_bad_json when both replies are not JSON", async () => {
    const fetchMock = vi.fn(async () => completion("not json at all"));

    await expect(
      callLlmJson({
        schema,
        system: "s",
        user: "u",
        config,
        fetchImpl: fetchMock as unknown as typeof fetch,
        sleepImpl,
      }),
    ).rejects.toMatchObject({ code: "llm_bad_json", attempts: 2 });
  });

  it("times out an attempt with llm_timeout", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    await expect(
      callLlmJson({
        schema,
        system: "s",
        user: "u",
        config: { ...config, timeoutMs: 20, maxRetries: 0 },
        fetchImpl: fetchMock as unknown as typeof fetch,
        sleepImpl,
      }),
    ).rejects.toMatchObject({ code: "llm_timeout", attempts: 1 });
  });

  it("retries upstream 429 once, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockResolvedValueOnce(completion({ title: "C", score: 3 }));

    const result = await callLlmJson({
      schema,
      system: "s",
      user: "u",
      config,
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl,
    });

    expect(result.meta.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry auth failures", async () => {
    const fetchMock = vi.fn(
      async () => new Response("unauthorized", { status: 401 }),
    );

    const promise = callLlmJson({
      schema,
      system: "s",
      user: "u",
      config,
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl,
    });

    await expect(promise).rejects.toBeInstanceOf(LlmError);
    await expect(promise).rejects.toMatchObject({
      code: "llm_auth_failed",
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an HTTP body without a message", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    await expect(
      callLlmJson({
        schema,
        system: "s",
        user: "u",
        config: { ...config, maxRetries: 0 },
        fetchImpl: fetchMock as unknown as typeof fetch,
        sleepImpl,
      }),
    ).rejects.toMatchObject({ code: "llm_invalid_response" });
  });
});

describe("reasoning effort", () => {
  it("is sent only when configured", async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = (async (_url: unknown, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const schema = z.object({ a: z.number() });
    const base = { apiKey: "k", baseUrl: "https://x/v1", model: "m", timeoutMs: 1000, maxRetries: 0, temperature: 0.5 };

    await callLlmJson({ schema, system: "s", user: "u", config: base, fetchImpl });
    await callLlmJson({ schema, system: "s", user: "u", config: { ...base, reasoningEffort: "low" }, fetchImpl });

    expect(bodies[0]).not.toHaveProperty("reasoning_effort");
    expect(bodies[1].reasoning_effort).toBe("low");
  });
});

describe("provider limits", () => {
  const schema = z.object({ a: z.number() });
  const config = { apiKey: "k", baseUrl: "https://x/v1", model: "m", timeoutMs: 1000, maxRetries: 1, temperature: 0.5 };
  const reply = (status: number, body: unknown) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  const ok = () => reply(200, { choices: [{ message: { content: '{"a":1}' } }] });

  it("reports HTTP 413 as its own error and does not retry it", async () => {
    const fetchImpl = vi.fn(async () => reply(413, { error: { message: "Request too large for model" } })) as unknown as typeof fetch;
    await expect(callLlmJson({ schema, system: "s", user: "u", config, fetchImpl })).rejects.toMatchObject({ code: "llm_request_too_large", status: 413 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a provider-side JSON validation failure (400) with a short repair and no resent reply", async () => {
    const bodies: { messages: { role: string; content: string }[] }[] = [];
    const fetchImpl = vi.fn(async (_url: unknown, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return bodies.length === 1
        ? reply(400, { error: { code: "json_validate_failed", message: "Failed to validate JSON.", failed_generation: "" } })
        : ok();
    }) as unknown as typeof fetch;
    const result = await callLlmJson({ schema, system: "s", user: "u", config, fetchImpl, sleepImpl: async () => undefined });
    expect(result.data).toEqual({ a: 1 });
    expect(result.meta.attempts).toBe(2);
    expect(bodies[1].messages.at(-1)?.content).toMatch(/could not be parsed as JSON/);
    expect(bodies[1].messages.some((m) => m.role === "assistant")).toBe(false);
  });

  it("does not send a very long invalid reply back when asking for a repair", async () => {
    const long = JSON.stringify({ a: "x".repeat(4000) });
    const bodies: { messages: { role: string }[] }[] = [];
    const fetchImpl = vi.fn(async (_url: unknown, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return bodies.length === 1 ? reply(200, { choices: [{ message: { content: long } }] }) : ok();
    }) as unknown as typeof fetch;
    await callLlmJson({ schema, system: "s", user: "u", config, fetchImpl, sleepImpl: async () => undefined });
    expect(bodies[1].messages.some((m) => m.role === "assistant")).toBe(false);
    expect(bodies[1].messages.at(-1)).toMatchObject({ role: "user" });
  });

  it("still echoes a short invalid reply so the model can fix it", async () => {
    const bodies: { messages: { role: string }[] }[] = [];
    const fetchImpl = vi.fn(async (_url: unknown, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return bodies.length === 1 ? reply(200, { choices: [{ message: { content: '{"a":"not a number"}' } }] }) : ok();
    }) as unknown as typeof fetch;
    await callLlmJson({ schema, system: "s", user: "u", config, fetchImpl, sleepImpl: async () => undefined });
    expect(bodies[1].messages.some((m) => m.role === "assistant")).toBe(true);
  });
});

describe("rejected keys and overloaded providers", () => {
  const schema = z.object({ a: z.number() });
  const config = { apiKey: "k", baseUrl: "https://x/v1", model: "m", timeoutMs: 1000, maxRetries: 2, temperature: 0.5 };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  it("reports a 401 as a rejected key and does not retry it", async () => {
    const fetchImpl = vi.fn(async () => reply(401, { error: { code: "invalid_api_key", message: "Invalid API Key" } })) as unknown as typeof fetch;
    await expect(callLlmJson({ schema, system: "s", user: "u", config, fetchImpl })).rejects.toMatchObject({ code: "llm_auth_failed", status: 401 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("treats a 403 the same way", async () => {
    const fetchImpl = vi.fn(async () => reply(403, { error: { message: "denied" } })) as unknown as typeof fetch;
    await expect(callLlmJson({ schema, system: "s", user: "u", config, fetchImpl })).rejects.toMatchObject({ code: "llm_auth_failed" });
  });

  it("waits longer before retrying a 503 'high demand', then succeeds", async () => {
    const waits: number[] = [];
    let n = 0;
    const fetchImpl = vi.fn(async () =>
      ++n < 3 ? reply(503, { error: { status: "UNAVAILABLE" } }) : reply(200, { choices: [{ message: { content: '{"a":1}' } }] }),
    ) as unknown as typeof fetch;
    const result = await callLlmJson({ schema, system: "s", user: "u", config, fetchImpl, sleepImpl: async (ms) => void waits.push(ms) });
    expect(result.data).toEqual({ a: 1 });
    expect(waits).toEqual([1_500, 3_000]);
  });
});
