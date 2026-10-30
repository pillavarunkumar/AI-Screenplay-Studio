import { describe, expect, it } from "vitest";
import { parseRetryAfterSeconds } from "./retry-after";

describe("parseRetryAfterSeconds", () => {
  it.each([
    [["...(TPM): Limit 8000, Used 5385. Please try again in 6.675s. Need more tokens?"], 7],
    [["Please try again in 850ms."], 1],
    [["Please try again in 1m3.2s."], 64],
    [["Please try again in 2m."], 120],
  ])("%j → %s", (details, expected) => {
    expect(parseRetryAfterSeconds(details)).toBe(expected);
  });

  it("returns undefined when there is nothing to read", () => {
    expect(parseRetryAfterSeconds(undefined)).toBeUndefined();
    expect(parseRetryAfterSeconds([])).toBeUndefined();
    expect(parseRetryAfterSeconds(["rate limit reached"])).toBeUndefined();
  });
});
