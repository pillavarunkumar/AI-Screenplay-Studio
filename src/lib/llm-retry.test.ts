import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { callWithRateLimitRetry } from "./llm-retry";

const ok = { data: { ok: true }, meta: { model: "m", attempts: 1, latencyMs: 1 } };

describe("callWithRateLimitRetry", () => {
  it("waits the advertised time and tries again", async () => {
    const call = vi.fn().mockRejectedValueOnce(new ApiError("llm_rate_limited", "busy", 429, { retryAfterSec: 7 })).mockResolvedValue(ok);
    const wait = vi.fn().mockResolvedValue(undefined);
    await callWithRateLimitRetry("t", {}, { call: call as never, wait });
    expect(wait).toHaveBeenCalledWith(8000);
  });

  it("gives up straight away on a long (daily-cap) wait instead of hanging", async () => {
    const call = vi.fn().mockRejectedValue(new ApiError("llm_rate_limited", "reset in 16 minutes", 429, { retryAfterSec: 946 }));
    const wait = vi.fn();
    await expect(callWithRateLimitRetry("t", {}, { call: call as never, wait })).rejects.toMatchObject({ retryAfterSec: 946 });
    expect(wait).not.toHaveBeenCalled();
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("stops after ten short waits", async () => {
    const call = vi.fn().mockRejectedValue(new ApiError("rate_limited", "x", 429, { retryAfterSec: 1 }));
    await expect(callWithRateLimitRetry("t", {}, { call: call as never, wait: async () => undefined })).rejects.toMatchObject({ code: "rate_limited" });
    expect(call).toHaveBeenCalledTimes(11);
  });

  it("passes the project language through", async () => {
    const call = vi.fn().mockResolvedValue(ok);
    await callWithRateLimitRetry("t", { a: 1 }, { call: call as never, language: "Telugu" });
    expect(call).toHaveBeenCalledWith("t", { a: 1 }, "Telugu");
  });
});

describe("request too large (HTTP 413)", () => {
  it("retries once with older context removed, then gives up", async () => {
    const tooBig = new ApiError("llm_request_too_large", "too large", 413);
    const call = vi.fn().mockRejectedValueOnce(tooBig).mockResolvedValue(ok);
    const input = { previousScenes: [{ heading: "a" }], bible: { facts: Array.from({ length: 30 }, (_, i) => `f${i}`) } };

    await callWithRateLimitRetry("writeScene", input, { call: call as never });

    const second = call.mock.calls[1][1] as typeof input;
    expect(second.previousScenes).toEqual([]);
    expect(second.bible.facts).toHaveLength(10);
    expect(second.bible.facts[9]).toBe("f29"); // newest facts survive
    expect(call).toHaveBeenCalledTimes(2);

    const stuck = vi.fn().mockRejectedValue(tooBig);
    await expect(callWithRateLimitRetry("t", input, { call: stuck as never })).rejects.toMatchObject({ code: "llm_request_too_large" });
    expect(stuck).toHaveBeenCalledTimes(2); // original + one smaller try, no loop
  });
});

describe("overloaded provider (HTTP 503)", () => {
  const overloaded = () => new ApiError("llm_upstream_error", "high demand", 502, { upstreamStatus: 503 });

  it("waits 8s, then 16s, and succeeds when the provider recovers", async () => {
    const call = vi.fn().mockRejectedValueOnce(overloaded()).mockRejectedValueOnce(overloaded()).mockResolvedValue(ok);
    const wait = vi.fn().mockResolvedValue(undefined);
    const onRateLimited = vi.fn();
    await callWithRateLimitRetry("t", {}, { call: call as never, wait, onRateLimited });
    expect(wait.mock.calls.map(([ms]) => ms)).toEqual([8000, 16000]);
    expect(onRateLimited).toHaveBeenCalledWith(8);
  });

  it("gives up after three waits", async () => {
    const call = vi.fn().mockRejectedValue(overloaded());
    const wait = vi.fn().mockResolvedValue(undefined);
    await expect(callWithRateLimitRetry("t", {}, { call: call as never, wait })).rejects.toMatchObject({ code: "llm_upstream_error" });
    expect(call).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledTimes(3);
  });

  it("does not wait on a real bad request (400) or an unknown status", async () => {
    const bad = vi.fn().mockRejectedValue(new ApiError("llm_upstream_error", "bad", 502, { upstreamStatus: 400 }));
    const wait = vi.fn();
    await expect(callWithRateLimitRetry("t", {}, { call: bad as never, wait })).rejects.toBeInstanceOf(ApiError);
    expect(bad).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});
