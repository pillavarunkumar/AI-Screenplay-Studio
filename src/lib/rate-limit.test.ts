import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit, then blocks", () => {
    const limiter = createRateLimiter({
      limit: 2,
      windowMs: 10_000,
      now: () => 1_000,
    });

    const first = limiter.check("1.2.3.4");
    const second = limiter.check("1.2.3.4");
    const third = limiter.check("1.2.3.4");

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(third).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSec: 10,
    });
  });

  it("resets after the window elapses", () => {
    let now = 1_000;
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 5_000,
      now: () => now,
    });

    expect(limiter.check("ip").allowed).toBe(true);
    expect(limiter.check("ip").allowed).toBe(false);

    now += 5_000;
    expect(limiter.check("ip").allowed).toBe(true);
  });

  it("keeps separate counters per IP", () => {
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 10_000,
      now: () => 1_000,
    });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(false);
  });
});
