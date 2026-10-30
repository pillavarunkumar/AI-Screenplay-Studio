"use client";

import { useState } from "react";
import { ErrorState } from "@/components/error-state";
import { SceneEditor } from "@/components/scene-editor";
import { ScreenplayScene } from "@/components/screenplay-scene";
import { StoryBiblePanel } from "@/components/story-bible-panel";
import type { Scene, ScenePlanOutput } from "@/lib/schemas/scene";
import type { BibleCharacter, StoryBible } from "@/lib/schemas/story-bible";
import type { StorylineOutput } from "@/lib/schemas/storyline";
import { estimateScript } from "@/lib/story-progress";
import { useLlmTask } from "@/lib/use-llm-task";

interface ScenesSectionProps {
  storyline: StorylineOutput;
  bible: StoryBible;
  scenes: Scene[];
  cast: BibleCharacter[];
  onBibleChange: (bible: StoryBible) => void;
  onBibleFacts: (facts: string[]) => void;
  onScenesReplace: (scenes: Scene[]) => void;
  onSceneChange: (
    id: string,
    patch: Partial<Omit<Scene, "id" | "order">>,
  ) => void;
  onSceneRemove: (id: string) => void;
  /** Has the AI write this scene's script. Rejects with an ApiError on failure. */
  onWriteScene: (id: string) => Promise<void>;
}

export function ScenesSection({
  storyline,
  bible,
  scenes,
  cast,
  onBibleChange,
  onBibleFacts,
  onScenesReplace,
  onSceneChange,
  onSceneRemove,
  onWriteScene,
}: ScenesSectionProps) {
  const scenePlan = useLlmTask<ScenePlanOutput>("scenes");
  const [showPreview, setShowPreview] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const planning = scenePlan.state.status === "loading";

  async function buildScenePlan() {
    if (
      scenes.length > 0 &&
      !window.confirm(
        "Replace all your scenes? Their scripts, camera plans and edits will be lost.",
      )
    ) {
      return;
    }

    setNotice(null);
    const result = await scenePlan.run({
      correctedIdea: storyline.correctedIdea,
      synopsis: storyline.synopsis,
      bible,
    });

    if (!result) return;

    const nextScenes: Scene[] = result.data.scenes.map((planned, order) => ({
      id: crypto.randomUUID(),
      order,
      heading: planned.heading,
      summary: planned.summary,
      elements: [],
      shotList: null,
    }));

    onScenesReplace(nextScenes);
    // A fresh notebook gets the tone the AI picked for the whole film.
    if (!bible.tone.trim() && result.data.tone?.trim()) onBibleChange({ ...bible, tone: result.data.tone.trim() });
    setNotice(
      `Built ${nextScenes.length} scenes from your story. Write each one below.`,
    );
  }

  function addBlankScene() {
    if (scenes.length >= 20) return;

    onScenesReplace([
      ...scenes,
      {
        id: crypto.randomUUID(),
        order: scenes.length,
        heading: "",
        summary: "",
        elements: [],
        shotList: null,
      },
    ]);
  }

  const stats = estimateScript(scenes);

  return (
    <section aria-labelledby="scenes-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Step 3 · Scenes
          </p>
          <h2 id="scenes-heading" className="mt-1 text-xl font-semibold">
            Turn your story into scenes
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">
            The notebook below is shared with the AI every time, so scenes, line ideas, polishing and camera plans all stay consistent. After finishing a scene, add its new facts to the notebook.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addBlankScene}
            disabled={planning || scenes.length >= 20}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add blank scene
          </button>
          <button
            type="button"
            onClick={() => {
              void buildScenePlan();
            }}
            disabled={planning}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {planning
              ? "Splitting your story into scenes…"
              : scenes.length > 0
                ? "Redo the scene plan"
                : "Plan my scenes"}
          </button>
        </div>
      </div>

      <StoryBiblePanel
        bible={bible}
        cast={cast}
        onChange={onBibleChange}
      />

      <div className="space-y-3" aria-live="polite">
        {scenePlan.state.status === "error" ? (
          <ErrorState
            error={scenePlan.state.error}
            onRetry={() => {
              void buildScenePlan();
            }}
          />
        ) : null}

        {planning ? (
          <div
            role="status"
            className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600"
          >
            Splitting your story into scenes. This can take up to about 25 seconds.
          </div>
        ) : null}

        {notice ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {notice}
          </p>
        ) : null}
      </div>

      {scenes.length === 0 && !planning ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center">
          <p className="text-sm font-medium">
            Start by splitting your story into scenes.
          </p>
          <p className="mx-auto mt-1 max-w-xl text-sm text-stone-500">
            You get three to six scenes, each with a proper heading and a one-line goal. You write the script yourself, with help for the next line, polishing and a camera plan in every scene.
          </p>
          <button
            type="button"
            onClick={() => {
              void buildScenePlan();
            }}
            className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
          >
            Split my story into scenes
          </button>
        </div>
      ) : null}

      {scenes.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-stone-600">
              {scenes.length} scene{scenes.length === 1 ? "" : "s"} ·{" "}
              {scenes.reduce(
                (total, scene) =>
                  total +
                  scene.elements.filter(
                    (element) => element.text.trim().length > 0,
                  ).length,
                0,
              )}{" "}
              script lines
              {stats.pages > 0 ? ` · ~${stats.pages} page${stats.pages === 1 ? "" : "s"} (~${stats.minutes} min)` : ""}
            </p>
            <button
              type="button"
              onClick={() => setShowPreview((previous) => !previous)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              aria-expanded={showPreview}
            >
              {showPreview ? "Hide script preview" : "Show script preview"}
            </button>
          </div>

          <div className="space-y-4">
            {scenes.map((scene) => (
              <SceneEditor
                key={scene.id}
                scene={scene}
                storyline={storyline}
                bible={bible}
                onChange={(patch) => onSceneChange(scene.id, patch)}
                onRemove={() => onSceneRemove(scene.id)}
                onWrite={() => onWriteScene(scene.id)}
                onBibleFacts={onBibleFacts}
              />
            ))}
          </div>

          {showPreview ? (
            <div className="rounded-2xl border border-stone-300 bg-stone-100 p-4 sm:p-8">
              <div className="mx-auto max-w-3xl space-y-6 rounded-md bg-white p-6 shadow-sm sm:p-10">
                <div className="border-b border-stone-200 pb-3 text-center">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                    Script preview
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-700">
                    {storyline.correctedIdea.slice(0, 140)}
                  </p>
                </div>

                {scenes.map((scene, index) => (
                  <div
                    key={scene.id}
                    className={
                      index === scenes.length - 1
                        ? ""
                        : "border-b border-dashed border-stone-200 pb-6"
                    }
                  >
                    <ScreenplayScene
                      heading={scene.heading}
                      elements={scene.elements}
                      emptyLabel="This scene has no script yet."
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
