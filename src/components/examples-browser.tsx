"use client";

import { useState } from "react";
import { ScreenplayScene } from "@/components/screenplay-scene";
import { UseExampleButton } from "@/components/use-example-button";
import type { ExampleStory } from "@/lib/examples";
import { renderPanelSvg } from "@/lib/storyboard-svg";

const TABS = [
  { id: "story", label: "The story" },
  { id: "cast", label: "Characters" },
  { id: "script", label: "The script" },
  { id: "camera", label: "Camera plan" },
  { id: "board", label: "Storyboard" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** One quiet grey for every story on the Examples page (the same grey as the comedy). */
const EXAMPLE_GREY = "bg-zinc-600";

const ROLE_LABEL = { protagonist: "Hero", antagonist: "Rival", supporting: "Supporting" } as const;

function Field({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-sm leading-6 text-stone-800">{children}</dd>
    </div>
  );
}

export function ExamplesBrowser({ examples, signedIn }: { examples: ExampleStory[]; signedIn: boolean }) {
  const [selected, setSelected] = useState(examples[0].id);
  const [tab, setTab] = useState<TabId>("story");
  const example = examples.find((item) => item.id === selected) ?? examples[0];
  const { draft } = example;
  const storyline = draft.storyline!;
  const analysis = storyline.analysis;
  let frameNumber = 0;

  return (
    <div>
      <div role="tablist" aria-label="Choose an example story" className="flex flex-wrap gap-3">
        {examples.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === selected}
            onClick={() => setSelected(item.id)}
            className={`flex items-center gap-3 rounded-2xl border p-2 pr-5 text-left transition ${
              item.id === selected ? "border-stone-900 bg-white shadow-sm" : "border-stone-200 bg-white/60 hover:bg-white"
            }`}
          >
            <span className={`h-12 w-12 shrink-0 rounded-xl ${EXAMPLE_GREY}`} aria-hidden="true" />
            <span>
              <span className="block text-xs font-medium text-stone-500">{item.genre}</span>
              <span className="block font-semibold">{item.title}</span>
            </span>
          </button>
        ))}
      </div>

      <article className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className={`flex flex-wrap items-end justify-between gap-3 ${EXAMPLE_GREY} px-6 py-6 text-white sm:px-8`}>
          <div>
            <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium backdrop-blur">{example.genre}</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{example.title}</h2>
            <p className="mt-1 max-w-xl text-white/90">{example.blurb}</p>
          </div>
          <UseExampleButton title={example.title} draft={draft} signedIn={signedIn} />
        </div>

        <div role="tablist" aria-label="Parts of the finished story" className="flex gap-1 overflow-x-auto border-b border-stone-200 px-4 pt-3 sm:px-6">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium ${
                tab === item.id ? "border-b-2 border-stone-900 text-stone-900" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8" role="tabpanel">
          {tab === "story" ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <dl className="space-y-4">
                {[
                  ["Beginning", storyline.synopsis.setup],
                  ["Middle", storyline.synopsis.complication],
                  ["End", storyline.synopsis.resolution],
                ].map(([label, text]) => (
                  <Field key={label} label={label}>
                    {text}
                  </Field>
                ))}
              </dl>
              {analysis ? (
                <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-100 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">What the AI noted about this story</p>
                  <dl className="space-y-3">
                    <Field label="The big question">{analysis.centralQuestion}</Field>
                    <Field label="What they want">{analysis.want}</Field>
                    <Field label="What they need">{analysis.need}</Field>
                    <Field label="What's at stake">{analysis.stakes}</Field>
                    <Field label="The message">{analysis.theme}</Field>
                  </dl>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "cast" ? (
            <div className="grid gap-4 md:grid-cols-3">
              {draft.characters.map((card) => {
                const p = card.profile!;
                return (
                  <section key={card.id} className="rounded-2xl border border-stone-200 p-5">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">{ROLE_LABEL[card.role]}</span>
                    <h3 className="mt-2 text-lg font-semibold">{p.name}</h3>
                    <dl className="mt-3 space-y-3">
                      <Field label="Looks">{p.physicalDescription}</Field>
                      <Field label="What they're like">{p.personality}</Field>
                      <Field label="What they want">{p.motivation}</Field>
                      <Field label="What holds them back">{p.internalConflict}</Field>
                      <Field label="How they talk">{p.voice}</Field>
                      <Field label="How they change">{p.arc}</Field>
                    </dl>
                  </section>
                );
              })}
            </div>
          ) : null}

          {tab === "script" ? (
            <div className="mx-auto max-w-2xl space-y-6">
              {draft.scenes.map((scene) => (
                <div key={scene.id} className="rounded-xl border border-stone-200 bg-[#fffdf8] p-1 shadow-sm">
                  <ScreenplayScene heading={scene.heading} elements={scene.elements} className="!bg-transparent" />
                </div>
              ))}
            </div>
          ) : null}

          {tab === "camera" ? (
            <div className="space-y-8">
              {draft.scenes.map((scene) => (
                <section key={scene.id}>
                  <h3 className="font-mono text-sm font-semibold uppercase">{scene.heading}</h3>
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200">
                    <table className="w-full min-w-[34rem] text-left text-sm">
                      <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                        <tr>
                          <th className="px-4 py-2">#</th>
                          <th className="px-4 py-2">Shot</th>
                          <th className="px-4 py-2">Angle</th>
                          <th className="px-4 py-2">Move</th>
                          <th className="px-4 py-2">What we see, and why</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {scene.shotList?.shots.map((shot) => (
                          <tr key={shot.id} className="align-top">
                            <td className="px-4 py-3 font-mono text-stone-400">{shot.order + 1}</td>
                            <td className="px-4 py-3 font-semibold">{shot.shotType}</td>
                            <td className="px-4 py-3 text-stone-600">{shot.cameraAngle}</td>
                            <td className="px-4 py-3 text-stone-600">{shot.movement}</td>
                            <td className="px-4 py-3 text-stone-700">
                              {shot.description}
                              <span className="mt-1 block text-xs text-stone-500">Why: {shot.reasoning}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {scene.shotList?.coverageNotes ? (
                    <p className="mt-2 text-sm text-stone-600">
                      <span className="font-medium text-stone-800">Filming tip: </span>
                      {scene.shotList.coverageNotes}
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          ) : null}

          {tab === "board" ? (
            <div className="space-y-8">
              {draft.scenes.map((scene) => (
                <section key={scene.id}>
                  <h3 className="font-mono text-sm font-semibold uppercase">{scene.heading}</h3>
                  <ol className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {scene.storyboard?.panels.map((panel, index) => {
                      frameNumber += 1;
                      return (
                        <li key={index}>
                          <div
                            className="overflow-hidden rounded-lg"
                            // renderPanelSvg escapes every string it draws.
                            dangerouslySetInnerHTML={{ __html: renderPanelSvg(panel, frameNumber, { mono: true }) }}
                          />
                          <p className="mt-1.5 text-xs text-stone-700">{panel.caption}</p>
                          {panel.dialogue ? <p className="text-xs italic text-stone-500">“{panel.dialogue}”</p> : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
