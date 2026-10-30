import { describe, expect, it } from "vitest";
import { COVERS, coverFor, initials, timeAgo } from "./format";

const now = Date.UTC(2026, 0, 15, 12, 0, 0);

describe("timeAgo", () => {
  it("uses friendly relative times", () => {
    expect(timeAgo(now - 10_000, now)).toBe("just now");
    expect(timeAgo(now - 60_000, now)).toBe("1 minute ago");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3 hours ago");
    expect(timeAgo(now - 30 * 3_600_000, now)).toBe("yesterday");
    expect(timeAgo(now - 4 * 86_400_000, now)).toBe("4 days ago");
  });

  it("falls back to a date after a week and never goes negative", () => {
    expect(timeAgo(now - 20 * 86_400_000, now)).toMatch(/2025|Dec/);
    expect(timeAgo(now + 5_000, now)).toBe("just now");
  });
});

describe("initials and covers", () => {
  it("builds initials", () => {
    expect(initials("varun kumar pilla")).toBe("VP");
    expect(initials("Ada")).toBe("AD");
    expect(initials("  ")).toBe("?");
    expect(initials("తెలుగు రాము")).toHaveLength(2);
  });

  it("picks a stable cover", () => {
    expect(coverFor("abc")).toBe(coverFor("abc"));
    expect(COVERS).toContain(coverFor("another-id"));
  });
});
