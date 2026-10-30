import { describe, expect, it } from "vitest";
import { appendDictation } from "./dictation";

describe("appendDictation", () => {
  it("capitalises the first chunk", () => {
    expect(appendDictation("", " a nurse finds a letter ")).toBe("A nurse finds a letter");
  });

  it("continues mid-sentence without recapitalising", () => {
    expect(appendDictation("A nurse finds", "a letter")).toBe("A nurse finds a letter");
  });

  it("capitalises after sentence-ending punctuation", () => {
    expect(appendDictation("It ends.", "then it begins")).toBe("It ends. Then it begins");
  });

  it("ignores empty chunks and respects the limit", () => {
    expect(appendDictation("Hello", "   ")).toBe("Hello");
    expect(appendDictation("a".repeat(10), "more words", 12)).toHaveLength(12);
  });
});
