import { describe, expect, it } from "vitest";
import { EXAMPLES } from "./examples";
import { StudioDraftSchema } from "./schemas/draft";
import { checkScene } from "./screenplay-format";
import { getMilestones } from "./story-progress";

describe("example stories", () => {
  it("has unique ids and titles", () => {
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length);
    expect(new Set(EXAMPLES.map((e) => e.title)).size).toBe(EXAMPLES.length);
  });

  it.each(EXAMPLES.map((e) => [e.title, e] as const))("%s is a valid saved story", (_title, example) => {
    // Strict parse: this is exactly what the server checks when the copy is created.
    const parsed = StudioDraftSchema.safeParse(example.draft);
    expect(parsed.success, JSON.stringify(parsed.success ? null : parsed.error.issues)).toBe(true);
    expect(example.draft.storyline?.analysis).toBeDefined();
    expect(example.draft.characters).toHaveLength(3);
    expect(example.draft.scenes.length).toBeGreaterThanOrEqual(2);
    // scene order is 0..n-1 and ids are unique
    expect(example.draft.scenes.map((s) => s.order)).toEqual(example.draft.scenes.map((_, i) => i));
  });

  it.each(EXAMPLES.map((e) => [e.title, e] as const))("%s follows the format rules", (_title, example) => {
    for (const scene of example.draft.scenes) {
      expect(checkScene(scene).map((issue) => issue.message)).toEqual([]);
    }
  });

  it("shows the whole journey: every scene has a camera plan and a matching storyboard", () => {
    for (const example of EXAMPLES) {
      for (const scene of example.draft.scenes) {
        expect(scene.shotList?.shots.length, `${example.title} scene ${scene.order + 1} shots`).toBeGreaterThanOrEqual(3);
        expect(scene.storyboard?.panels.length, `${example.title} scene ${scene.order + 1} panels`).toBe(scene.shotList!.shots.length);
        // The storyboard follows the camera plan shot for shot.
        scene.shotList!.shots.forEach((shot, i) => {
          expect(scene.storyboard!.panels[i].shotType.toLowerCase()).toBe(shot.shotType.toLowerCase());
        });
      }
    }
  });

  it("shows real progress so the examples feel finished", () => {
    for (const example of EXAMPLES) {
      const done = getMilestones(example.draft).filter((m) => m.done).length;
      expect(done).toBeGreaterThanOrEqual(5);
    }
  });
});
