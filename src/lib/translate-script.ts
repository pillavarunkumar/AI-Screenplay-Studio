import { ApiError, callLlm } from "./api-client";
import { callWithRateLimitRetry } from "./llm-retry";
import type { Scene, ScriptElementType } from "./schemas/scene";
import type { TranslateSceneOutput } from "./schemas/translate";

export interface TranslatedScene {
  heading: string;
  elements: { type: ScriptElementType; text: string }[];
}

type CallFn = typeof callLlm;

/**
 * Translates one scene. Blank lines are skipped and re-inserted as blanks, so
 * the model only ever sees (and must return) the visible lines.
 */
export async function translateScene(
  scene: Pick<Scene, "heading" | "elements">,
  language: string,
  characterNames: string[],
  options: {
    call?: CallFn;
    wait?: (ms: number) => Promise<void>;
    onRateLimited?: (seconds: number) => void;
  } = {},
): Promise<TranslatedScene> {
  const visible = scene.elements.filter((element) => element.text.trim());
  const input = {
    language,
    heading: scene.heading,
    elements: visible.map(({ type, text }) => ({ type, text: text.trim() })),
    characterNames,
  };

  if (!scene.heading.trim() && visible.length === 0) {
    return { heading: "", elements: [] };
  }

  const { data } = await callWithRateLimitRetry<TranslateSceneOutput>(
    "translateScene",
    input,
    options,
  );
  if (data.lines.length !== visible.length) {
    throw new ApiError(
      "llm_schema_mismatch",
      "The translation dropped or added lines. Try again.",
      502,
    );
  }
  return {
    heading: data.heading,
    elements: visible.map((element, index) => ({
      type: element.type,
      text: data.lines[index],
    })),
  };
}
