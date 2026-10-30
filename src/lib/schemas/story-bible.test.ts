import { describe, expect, it } from "vitest";
import { EMPTY_STORY_BIBLE, StoryBibleSchema } from "./story-bible";

describe("StoryBibleSchema", () => {
  it("accepts the empty bible", () => {
    expect(StoryBibleSchema.safeParse(EMPTY_STORY_BIBLE).success).toBe(true);
  });

  it("accepts editable blank fields", () => {
    const result = StoryBibleSchema.safeParse({
      tone: "",
      characters: [{ name: "", role: "", summary: "" }],
      facts: [""],
    });
    expect(result.success).toBe(true);
  });

  it("caps facts at forty", () => {
    const result = StoryBibleSchema.safeParse({
      ...EMPTY_STORY_BIBLE,
      facts: Array.from({ length: 41 }, (_, index) => `Fact ${index}`),
    });
    expect(result.success).toBe(false);
  });

  it("caps bible characters at twelve", () => {
    const result = StoryBibleSchema.safeParse({
      ...EMPTY_STORY_BIBLE,
      characters: Array.from({ length: 13 }, (_, index) => ({
        name: `Character ${index}`,
        role: "Supporting",
        summary: "",
      })),
    });
    expect(result.success).toBe(false);
  });

  it("caps the tone", () => {
    const result = StoryBibleSchema.safeParse({
      ...EMPTY_STORY_BIBLE,
      tone: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});
