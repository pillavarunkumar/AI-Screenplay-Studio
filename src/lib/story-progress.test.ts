import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT } from "./schemas/draft";
import { estimateScript, getMilestones } from "./story-progress";

const el = (text: string) => ({ id: text, type: "action" as const, text });

describe("story progress", () => {
  it("starts with nothing done", () => {
    expect(getMilestones(EMPTY_DRAFT).every((m) => !m.done)).toBe(true);
  });

  it("marks idea, writing, and bible milestones", () => {
    const draft = {
      ...EMPTY_DRAFT,
      idea: "A nurse inherits a lighthouse",
      storyBible: { ...EMPTY_DRAFT.storyBible, facts: ["x"] },
      scenes: [{ id: "s", order: 0, heading: "INT.", summary: "", elements: [el("a"), el("b"), el("c")], shotList: null }],
    };
    const done = Object.fromEntries(getMilestones(draft).map((m) => [m.id, m.done]));
    expect(done).toMatchObject({ idea: true, scenes: true, write: true, bible: true, storyline: false, shots: false });
  });

  it("estimates pages from words", () => {
    expect(estimateScript([])).toEqual({ words: 0, pages: 0, minutes: 0 });
    const words = Array.from({ length: 340 }, () => "w").join(" ");
    expect(estimateScript([{ heading: "", elements: [el(words)] }])).toMatchObject({ words: 340, pages: 2 });
  });
});
