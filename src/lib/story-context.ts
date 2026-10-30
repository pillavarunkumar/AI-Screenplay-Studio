import type { CharacterRole } from "./schemas/characters";
import type { StudioDraft } from "./schemas/draft";
import type { CastDetail, Scene, WriteSceneInput } from "./schemas/scene";
import type { BibleCharacter } from "./schemas/story-bible";

const ROLE_LABEL: Record<CharacterRole, string> = {
  protagonist: "Protagonist",
  antagonist: "Antagonist",
  supporting: "Supporting",
};

/** Characters with a finished profile, as the story notebook lists them. */
export function bibleCast(draft: StudioDraft): BibleCharacter[] {
  return draft.characters.flatMap((card) => {
    const profile = card.profile;
    if (!profile || !profile.name.trim()) return [];
    return [
      {
        name: profile.name.trim(),
        role: ROLE_LABEL[card.role],
        summary: [profile.personality, profile.motivation, profile.internalConflict]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" ")
          .slice(0, 400),
      },
    ];
  });
}

/** Voices and wants for the scene writer, trimmed to keep requests small. */
export function castDetails(draft: StudioDraft): CastDetail[] {
  return draft.characters.flatMap((card) => {
    const profile = card.profile;
    if (!profile || !profile.name.trim()) return [];
    return [
      {
        name: profile.name.trim(),
        role: ROLE_LABEL[card.role],
        personality: profile.personality.trim().slice(0, 400),
        motivation: profile.motivation.trim().slice(0, 400),
        voice: profile.voice.trim().slice(0, 400),
      },
    ];
  });
}

const visible = (scene: Pick<Scene, "elements">) => scene.elements.filter((element) => element.text.trim());

/** A scene counts as written once it has a real run of script lines. */
export const isSceneWritten = (scene: Pick<Scene, "elements">) => visible(scene).length >= 4;

/** The common request body for scene-scoped tasks. */
export function sceneContext(draft: StudioDraft, scene: Scene) {
  if (!draft.storyline) throw new Error("Build the story first.");
  return {
    correctedIdea: draft.storyline.correctedIdea,
    synopsis: draft.storyline.synopsis,
    bible: draft.storyBible,
    scene: {
      heading: scene.heading,
      summary: scene.summary,
      elements: visible(scene),
    },
  };
}

/** A few lines at the end of a scene, as `NORA: text`, so the next scene can pick up from there. */
function lastLines(scene: Scene): string {
  return visible(scene)
    .slice(-6)
    .map((element) => (element.type === "character" ? `${element.text.trim()}:` : element.text.trim()))
    .join(" ")
    .slice(0, 1_500);
}

export function writeSceneInput(draft: StudioDraft, scene: Scene): WriteSceneInput {
  const ordered = [...draft.scenes].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((candidate) => candidate.id === scene.id);

  return {
    ...sceneContext(draft, scene),
    cast: castDetails(draft).slice(0, 8),
    previousScenes: ordered
      .slice(Math.max(0, index - 3), Math.max(0, index))
      .map((previous) => ({
        heading: previous.heading,
        summary: previous.summary,
        lastLines: lastLines(previous),
      })),
    position: { index: Math.max(0, index), total: Math.max(1, ordered.length) },
  };
}
