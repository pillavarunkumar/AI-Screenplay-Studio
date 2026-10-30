import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-redirect";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/projects/abc?x=1")).toBe("/projects/abc?x=1");
  });

  it("rejects external and protocol-relative targets", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", ""]) {
      expect(safeNext(bad)).toBe("/projects");
    }
    expect(safeNext(undefined, "/")).toBe("/");
  });
});
