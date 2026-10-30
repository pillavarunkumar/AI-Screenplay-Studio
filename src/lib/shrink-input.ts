/**
 * Makes a request body smaller without changing what is being asked. Used once, when the AI
 * provider says a request was too large for the plan (HTTP 413): drops older context first
 * (the scenes before this one, long cast notes, old notebook facts), then trims long text.
 * Returns the same object untouched when there is nothing left to trim.
 */
type Json = Record<string, unknown>;

const clip = (text: unknown, max: number) => (typeof text === "string" && text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function shrinkRequestInput<T>(input: T): T {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const next: Json = { ...(input as Json) };

  // Continuity from earlier scenes is nice to have; the request still makes sense without it.
  if (Array.isArray(next.previousScenes)) next.previousScenes = [];

  if (Array.isArray(next.cast)) {
    next.cast = next.cast.map((member) => {
      const m = { ...(member as Json) };
      for (const key of ["personality", "motivation", "voice"]) m[key] = clip(m[key], 120);
      return m;
    });
  }

  if (next.bible && typeof next.bible === "object") {
    const bible = { ...(next.bible as Json) };
    if (Array.isArray(bible.facts)) bible.facts = bible.facts.slice(-10);
    if (Array.isArray(bible.characters)) {
      bible.characters = bible.characters.map((c) => ({ ...(c as Json), summary: clip((c as Json).summary, 160) }));
    }
    next.bible = bible;
  }

  if (next.scene && typeof next.scene === "object") {
    const scene = { ...(next.scene as Json) };
    if (Array.isArray(scene.elements)) {
      scene.elements = scene.elements
        .slice(-60)
        .map((element) => ({ ...(element as Json), text: clip((element as Json).text, 500) }));
    }
    scene.summary = clip(scene.summary, 400);
    next.scene = scene;
  }

  if (Array.isArray(next.shots)) next.shots = next.shots.slice(0, 6);
  return next as T;
}
