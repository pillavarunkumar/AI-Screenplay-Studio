"use client";

import { useRef, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api-client";
import { useProjectLanguage } from "@/lib/language-context";
import { callWithRateLimitRetry } from "@/lib/llm-retry";
import type { Scene } from "@/lib/schemas/scene";
import type { StoryBible } from "@/lib/schemas/story-bible";
import type { StorylineOutput } from "@/lib/schemas/storyline";
import { CAMERA_MOVEMENTS, type Storyboard, type StoryboardPanel } from "@/lib/schemas/storyboard";
import { buildStoryboardHtml } from "@/lib/storyboard-export";
import { renderPanelSvg } from "@/lib/storyboard-svg";

interface StoryboardStepProps {
  title: string;
  storyline: StorylineOutput;
  bible: StoryBible;
  scenes: Scene[];
  onSceneChange: (id: string, patch: Partial<Omit<Scene, "id" | "order">>) => void;
}

const hasContent = (scene: Scene) =>
  scene.heading.trim() !== "" || scene.elements.some((element) => element.text.trim());

export function StoryboardStep({ title, storyline, bible, scenes, onSceneChange }: StoryboardStepProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [queue, setQueue] = useState<{ done: number; total: number; note?: string } | null>(null);
  const [error, setError] = useState<{ error: ApiError; sceneId: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const language = useProjectLanguage();
  const cancelled = useRef(false);
  const working = busyId !== null || queue !== null;

  async function generate(scene: Scene) {
    setBusyId(scene.id);
    setError(null);
    try {
      const { data } = await callWithRateLimitRetry<Storyboard>("storyboard", {
        correctedIdea: storyline.correctedIdea,
        synopsis: storyline.synopsis,
        bible,
        scene: {
          heading: scene.heading,
          summary: scene.summary,
          elements: scene.elements.filter((element) => element.text.trim()),
        },
        shots: (scene.shotList?.shots ?? []).slice(0, 10).map((shot) => ({
          shotType: shot.shotType,
          cameraAngle: shot.cameraAngle,
          movement: shot.movement,
          description: shot.description,
        })),
      }, {
        language,
        onRateLimited: (seconds) =>
          setQueue((current) => (current ? { ...current, note: `The AI needs a short break. Continuing in ${seconds}s…` } : current)),
      });
      onSceneChange(scene.id, { storyboard: data });
      return true;
    } catch (caught) {
      setError({
        error: caught instanceof ApiError ? caught : new ApiError("internal", "Could not draw this storyboard.", 500),
        sceneId: scene.id,
      });
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function generateAll() {
    const todo = scenes.filter((scene) => hasContent(scene) && !scene.storyboard);
    cancelled.current = false;
    setQueue({ done: 0, total: todo.length });
    for (let index = 0; index < todo.length; index += 1) {
      if (cancelled.current) break;
      if (!(await generate(todo[index]))) break;
      setQueue({ done: index + 1, total: todo.length });
    }
    setQueue(null);
  }

  function printBoard() {
    const popup = window.open("", "_blank");
    if (!popup) {
      window.alert("Allow pop-ups for this site, then choose “Save as PDF” in the print dialog.");
      return;
    }
    popup.document.write(buildStoryboardHtml(scenes, title));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  const drawn = scenes.filter((scene) => scene.storyboard).length;
  const missing = scenes.filter((scene) => hasContent(scene) && !scene.storyboard).length;
  const button =
    "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section aria-labelledby="storyboard-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Step 4 · Storyboard</p>
          <h2 id="storyboard-heading" className="mt-1 text-xl font-semibold">See every scene as frames</h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            The AI plans each frame — shot size, angle, camera move, and where everyone stands — and sketches it.
            If a scene has a camera plan, the board follows it shot for shot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generateAll}
            disabled={working || missing === 0}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {missing === 0 ? "All scenes drawn" : `Draw ${missing} scene${missing === 1 ? "" : "s"}`}
          </button>
          {queue ? (
            <button type="button" className={button} onClick={() => { cancelled.current = true; }}>
              Cancel
            </button>
          ) : null}
          <button type="button" className={button} onClick={printBoard} disabled={drawn === 0}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {queue ? (
        <div role="status" className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-600">
            Drawing scene {Math.min(queue.done + 1, queue.total)} of {queue.total}… {queue.note}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(queue.done / queue.total) * 100}%` }} />
          </div>
        </div>
      ) : null}

      {scenes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-center text-sm text-stone-500">
          Plan some scenes first, then come back to draw them.
        </p>
      ) : null}

      <div className="space-y-6">
        {scenes.map((scene) => {
          let counter = 0;
          for (const earlier of scenes) {
            if (earlier.order >= scene.order) break;
            counter += earlier.storyboard?.panels.length ?? 0;
          }
          const loading = busyId === scene.id;
          const sceneError = error?.sceneId === scene.id ? error.error : null;

          return (
            <article key={scene.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-stone-400">{String(scene.order + 1).padStart(2, "0")}</p>
                  <h3 className="truncate font-mono text-sm font-semibold uppercase">
                    {scene.heading.trim() || "Untitled scene"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {scene.shotList ? `Follows the ${scene.shotList.shots.length}-shot camera plan` : "No camera plan yet — the AI picks the shots"}
                  </p>
                </div>
                <button
                  type="button"
                  className={button}
                  disabled={working || !hasContent(scene)}
                  onClick={() => void generate(scene)}
                >
                  {loading ? "Drawing…" : scene.storyboard ? "Redraw" : "Draw storyboard"}
                </button>
              </div>

              {sceneError ? (
                <div className="mt-4">
                  <ErrorState error={sceneError} onRetry={() => void generate(scene)} />
                </div>
              ) : null}

              {loading ? (
                <div role="status" className="mt-4 grid animate-pulse gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => <div key={i} className="aspect-video rounded-lg bg-stone-100" />)}
                </div>
              ) : scene.storyboard ? (
                <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {scene.storyboard.panels.map((panel, index) => (
                    <li key={index}>
                      {editing === `${scene.id}:${index}` ? (
                        <PanelEditor
                          panel={panel}
                          onCancel={() => setEditing(null)}
                          onSave={(next) => {
                            onSceneChange(scene.id, {
                              storyboard: {
                                panels: scene.storyboard!.panels.map((p, i) => (i === index ? next : p)),
                              },
                            });
                            setEditing(null);
                          }}
                          onDelete={() => {
                            const rest = scene.storyboard!.panels.filter((_, i) => i !== index);
                            onSceneChange(scene.id, { storyboard: rest.length > 0 ? { panels: rest } : null });
                            setEditing(null);
                          }}
                        />
                      ) : (
                      <>
                      <div
                        className="overflow-hidden rounded-lg"
                        // renderPanelSvg escapes every model-supplied string.
                        dangerouslySetInnerHTML={{ __html: renderPanelSvg(panel, counter + index + 1) }}
                      />
                      <p className="mt-1.5 text-xs text-stone-700">{panel.caption}</p>
                      {panel.dialogue ? <p className="text-xs italic text-stone-500">“{panel.dialogue}”</p> : null}
                      {panel.movement !== "static" ? (
                        <p className="text-[11px] text-red-700">Camera: {panel.movement.replace("-", " ")}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setEditing(`${scene.id}:${index}`)}
                        disabled={working}
                        className="mt-1 text-xs font-medium text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline disabled:opacity-50"
                      >
                        ✎ Edit frame
                      </button>
                      </>
                      )}
                    </li>
                  ))}
                </ol>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const FIELD = "mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs font-normal outline-none focus:border-stone-500";

/** Edits one frame's text and camera settings; saved only on confirm so a blank caption can never be stored. */
function PanelEditor({
  panel,
  onSave,
  onCancel,
  onDelete,
}: {
  panel: StoryboardPanel;
  onSave: (panel: StoryboardPanel) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [values, setValues] = useState(panel);
  const set = <K extends keyof StoryboardPanel>(key: K, value: StoryboardPanel[K]) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const valid = values.shotType.trim() !== "" && values.caption.trim() !== "";

  return (
    <form
      className="space-y-2 rounded-lg border border-stone-300 bg-stone-50 p-3 text-xs font-medium"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onSave({
          ...values,
          shotType: values.shotType.trim(),
          cameraAngle: values.cameraAngle.trim() || "Eye level",
          caption: values.caption.trim(),
          dialogue: values.dialogue.trim(),
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <label>Shot<input className={FIELD} maxLength={60} value={values.shotType} onChange={(e) => set("shotType", e.target.value)} /></label>
        <label>Angle<input className={FIELD} maxLength={60} value={values.cameraAngle} onChange={(e) => set("cameraAngle", e.target.value)} /></label>
        <label>Camera move
          <select className={FIELD} value={values.movement} onChange={(e) => set("movement", e.target.value as StoryboardPanel["movement"])}>
            {CAMERA_MOVEMENTS.map((m) => <option key={m} value={m}>{m.replace("-", " ")}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>Place
            <select className={FIELD} value={values.setting} onChange={(e) => set("setting", e.target.value as StoryboardPanel["setting"])}>
              <option value="interior">Interior</option>
              <option value="exterior">Exterior</option>
            </select>
          </label>
          <label>Time
            <select className={FIELD} value={values.time} onChange={(e) => set("time", e.target.value as StoryboardPanel["time"])}>
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
          </label>
        </div>
      </div>
      <label className="block">Caption<textarea rows={3} className={FIELD} maxLength={300} value={values.caption} onChange={(e) => set("caption", e.target.value)} /></label>
      <label className="block">Dialogue<input className={FIELD} maxLength={240} value={values.dialogue} onChange={(e) => set("dialogue", e.target.value)} /></label>
      {!valid ? <p role="alert" className="text-red-700">Shot and caption can&apos;t be empty.</p> : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" disabled={!valid} className="rounded-md bg-stone-900 px-3 py-1.5 text-white disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-stone-300 bg-white px-3 py-1.5">Cancel</button>
        <button type="button" onClick={onDelete} className="ml-auto rounded-md px-3 py-1.5 text-red-700 hover:bg-red-50">Delete frame</button>
      </div>
    </form>
  );
}
