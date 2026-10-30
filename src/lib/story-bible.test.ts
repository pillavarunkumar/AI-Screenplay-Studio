import { describe, expect, it } from "vitest";
import { MAX_BIBLE_FACTS, mergeBibleFacts } from "./story-bible";

describe("mergeBibleFacts", () => {
  it("appends new facts in order", () => {
    expect(
      mergeBibleFacts(
        ["Nora inherits the lighthouse."],
        ["The ferry leaves at dawn.", "Mara has a matching tin."],
      ),
    ).toEqual([
      "Nora inherits the lighthouse.",
      "The ferry leaves at dawn.",
      "Mara has a matching tin.",
    ]);
  });

  it("deduplicates case-insensitively and trims incoming facts", () => {
    expect(
      mergeBibleFacts(
        ["Nora is an only child."],
        [
          "  nora IS AN ONLY CHILD.  ",
          "The lighthouse is on a cliff.",
          "the lighthouse is on a cliff.",
          "   ",
        ],
      ),
    ).toEqual([
      "Nora is an only child.",
      "The lighthouse is on a cliff.",
    ]);
  });

  it("stops at the fact limit without dropping existing facts", () => {
    expect(mergeBibleFacts(["A"], ["B", "C", "D"], 3)).toEqual(["A", "B", "C"]);
  });

  it("returns the existing list when every incoming fact is a duplicate", () => {
    const existing = ["Nora is an only child."];
    expect(mergeBibleFacts(existing, ["nora is an only child."])).toEqual(
      existing,
    );
  });

  it("does not mutate either input array", () => {
    const existing = ["A"];
    const incoming = ["B"];

    mergeBibleFacts(existing, incoming);

    expect(existing).toEqual(["A"]);
    expect(incoming).toEqual(["B"]);
  });

  it("uses the app-wide limit by default", () => {
    const existing = Array.from(
      { length: MAX_BIBLE_FACTS },
      (_, index) => `Fact ${index}`,
    );

    expect(mergeBibleFacts(existing, ["One too many"])).toHaveLength(
      MAX_BIBLE_FACTS,
    );
  });
});
