import { describe, expect, it } from "vitest";
import { shrinkRequestInput } from "./shrink-input";
import { EXAMPLES } from "./examples";
import { writeSceneInput } from "./story-context";

describe("shrinkRequestInput", () => {
  it("makes a real scene-writing request smaller while keeping what the scene needs", () => {
    const draft = EXAMPLES[0].draft;
    const input = writeSceneInput(draft, draft.scenes[1]);
    const small = shrinkRequestInput(input);

    expect(JSON.stringify(small).length).toBeLessThan(JSON.stringify(input).length);
    expect(small.previousScenes).toEqual([]);
    // Still has everything required to write the scene.
    expect(small.scene.heading).toBe(input.scene.heading);
    expect(small.cast.map((c) => c.name)).toEqual(input.cast.map((c) => c.name));
    expect(small.position).toEqual(input.position);
    expect(small.correctedIdea).toBe(input.correctedIdea);
  });

  it("trims long script text and keeps the latest lines", () => {
    const elements = Array.from({ length: 100 }, (_, i) => ({ id: String(i), type: "action", text: `${i} ${"x".repeat(900)}` }));
    const small = shrinkRequestInput({ scene: { heading: "h", summary: "s".repeat(900), elements } }) as { scene: { summary: string; elements: { id: string; text: string }[] } };
    expect(small.scene.elements).toHaveLength(60);
    expect(small.scene.elements[59].id).toBe("99");
    expect(small.scene.elements[0].text.length).toBeLessThanOrEqual(500);
    expect(small.scene.summary.length).toBeLessThanOrEqual(400);
  });

  it("leaves non-objects and unknown shapes alone", () => {
    expect(shrinkRequestInput("text")).toBe("text");
    expect(shrinkRequestInput(null)).toBeNull();
    expect(shrinkRequestInput({ a: 1 })).toEqual({ a: 1 });
  });
});
