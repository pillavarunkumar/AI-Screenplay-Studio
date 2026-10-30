import type { StudioDraft } from "./schemas/draft";
import type { Scene } from "./schemas/scene";

export interface Milestone {
  id: string;
  label: string;
  hint: string;
  done: boolean;
}

const WORDS_PER_PAGE = 170;

export function estimateScript(scenes: readonly Pick<Scene, "heading" | "elements">[]) {
  const words = scenes.reduce(
    (total, scene) =>
      total +
      scene.elements.reduce(
        (sum, element) => sum + (element.text.trim() ? element.text.trim().split(/\s+/).length : 0),
        0,
      ),
    0,
  );
  const pages = words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_PAGE));
  return { words, pages, minutes: pages };
}

export function getMilestones(draft: StudioDraft): Milestone[] {
  const castDone = draft.characters.filter((c) => c.profile?.name.trim()).length;
  const written = draft.scenes.filter(
    (scene) => scene.elements.filter((e) => e.text.trim()).length >= 3,
  ).length;

  return [
    { id: "idea", label: "Write your idea", hint: "Type it or tell it out loud.", done: draft.idea.trim().length >= 10 },
    { id: "storyline", label: "Build your story", hint: "Get a beginning, middle and end.", done: draft.storyline !== null },
    { id: "cast", label: "Cast 3 characters", hint: "A hero, a rival, and one more.", done: castDone >= 3 },
    { id: "scenes", label: "Plan the scenes", hint: "Split your story into scenes.", done: draft.scenes.length > 0 },
    { id: "write", label: "Write a scene", hint: "Add at least 3 script lines to one scene.", done: written > 0 },
    { id: "shots", label: "Make a camera plan", hint: "Plan the camera for a scene.", done: draft.scenes.some((s) => s.shotList !== null) },
    { id: "board", label: "Draw a storyboard", hint: "Turn a scene into frames.", done: draft.scenes.some((s) => s.storyboard) },
    { id: "bible", label: "Fill your story notebook", hint: "Add a scene's facts to it.", done: draft.storyBible.facts.length > 0 },
  ];
}
