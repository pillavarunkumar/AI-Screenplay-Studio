import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { translateScene } from "./translate-script";

const meta = { model: "m", attempts: 1, latencyMs: 1 };
const scene = {
  heading: "INT. LIGHTHOUSE - NIGHT",
  elements: [
    { id: "1", type: "character" as const, text: "NORA" },
    { id: "2", type: "dialogue" as const, text: "  " },
    { id: "3", type: "dialogue" as const, text: "Who left these?" },
  ],
};

describe("translateScene", () => {
  it("sends only visible lines and keeps the original element types", async () => {
    const call = vi.fn().mockResolvedValue({
      data: { heading: "అంతర్. లైట్‌హౌస్ - రాత్రి", lines: ["నోరా", "ఇవి ఎవరు వదిలారు?"] },
      meta,
    });
    const result = await translateScene(scene, "Telugu", ["Nora"], { call });

    expect(call.mock.calls[0][1].elements).toHaveLength(2);
    expect(result.elements).toEqual([
      { type: "character", text: "నోరా" },
      { type: "dialogue", text: "ఇవి ఎవరు వదిలారు?" },
    ]);
  });

  it("rejects replies with the wrong number of lines", async () => {
    const call = vi.fn().mockResolvedValue({ data: { heading: "x", lines: ["only one"] }, meta });
    await expect(translateScene(scene, "Telugu", [], { call })).rejects.toMatchObject({
      code: "llm_schema_mismatch",
    });
  });

  it("waits out rate limits and retries", async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("rate_limited", "slow down", 429, { retryAfterSec: 3 }))
      .mockResolvedValue({ data: { heading: "h", lines: ["a", "b"] }, meta });
    const wait = vi.fn().mockResolvedValue(undefined);
    const onRateLimited = vi.fn();

    await translateScene(scene, "Hindi", [], { call, wait, onRateLimited });
    expect(wait).toHaveBeenCalledWith(4000);
    expect(onRateLimited).toHaveBeenCalledWith(4);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("gives up on non-rate-limit errors immediately", async () => {
    const call = vi.fn().mockRejectedValue(new ApiError("llm_timeout", "slow", 504));
    await expect(translateScene(scene, "Hindi", [], { call })).rejects.toMatchObject({ code: "llm_timeout" });
    expect(call).toHaveBeenCalledTimes(1);
  });
});
