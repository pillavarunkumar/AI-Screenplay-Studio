"use client";

import type {
  BibleCharacter,
  StoryBible,
} from "@/lib/schemas/story-bible";

interface StoryBiblePanelProps {
  bible: StoryBible;
  cast: BibleCharacter[];
  onChange: (bible: StoryBible) => void;
}

export function StoryBiblePanel({
  bible,
  cast,
  onChange,
}: StoryBiblePanelProps) {
  const update = (patch: Partial<StoryBible>) =>
    onChange({ ...bible, ...patch });

  const updateCharacter = (
    index: number,
    patch: Partial<BibleCharacter>,
  ) => {
    update({
      characters: bible.characters.map((character, characterIndex) =>
        characterIndex === index ? { ...character, ...patch } : character,
      ),
    });
  };

  const addCharacter = () => {
    if (bible.characters.length >= 12) return;
    update({
      characters: [
        ...bible.characters,
        { name: "", role: "", summary: "" },
      ],
    });
  };

  const removeCharacter = (index: number) => {
    update({
      characters: bible.characters.filter(
        (_character, characterIndex) => characterIndex !== index,
      ),
    });
  };

  const importCast = () => {
    const seen = new Set(
      bible.characters
        .map((character) => character.name.trim().toLowerCase())
        .filter(Boolean),
    );

    const additions: BibleCharacter[] = [];
    for (const character of cast) {
      const name = character.name.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      additions.push(character);
    }

    update({
      characters: [...bible.characters, ...additions].slice(0, 12),
    });
  };

  const updateFact = (index: number, value: string) => {
    update({
      facts: bible.facts.map((fact, factIndex) =>
        factIndex === index ? value : fact,
      ),
    });
  };

  const addFact = () => {
    if (bible.facts.length >= 40) return;
    update({ facts: [...bible.facts, ""] });
  };

  const removeFact = (index: number) => {
    update({
      facts: bible.facts.filter((_fact, factIndex) => factIndex !== index),
    });
  };

  const castAvailable = cast.some(
    (character) =>
      character.name.trim().length > 0 &&
      !bible.characters.some(
        (existing) =>
          existing.name.trim().toLowerCase() ===
          character.name.trim().toLowerCase(),
      ),
  );

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">Story notebook</h3>
            <span className="rounded-full bg-amber-200/70 px-2.5 py-1 text-[11px] font-medium text-amber-900">
              Shared with the AI every time
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Keep your characters, tone, and the facts of your story here. Fix anything the AI gets wrong. Every suggestion, polish and camera plan uses this notebook.
          </p>
        </div>
        <span className="text-xs text-amber-800">Saves automatically</span>
      </div>

      <div className="mt-5">
        <label
          htmlFor="bible-tone"
          className="text-xs font-semibold uppercase tracking-widest text-stone-500"
        >
          Tone
        </label>
        <input
          id="bible-tone"
          type="text"
          value={bible.tone}
          maxLength={200}
          placeholder="e.g. wintry, restrained, hopeful — laughs that catch in the throat"
          onChange={(event) => update({ tone: event.target.value })}
          className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-200"
        />
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Characters
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={importCast}
              disabled={!castAvailable}
              className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import cast ({cast.length})
            </button>
            <button
              type="button"
              onClick={addCharacter}
              disabled={bible.characters.length >= 12}
              className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Add character
            </button>
          </div>
        </div>

        {bible.characters.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-amber-300 bg-white/60 px-3 py-3 text-sm text-stone-500">
            No characters yet. Bring in your cast or add them by hand, so the AI knows who’s in your story.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {bible.characters.map((character, index) => (
              <li
                key={`bible-character-${index}`}
                className="rounded-lg border border-amber-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={character.name}
                    maxLength={80}
                    aria-label={`Bible character ${index + 1} name`}
                    placeholder="Name"
                    onChange={(event) =>
                      updateCharacter(index, { name: event.target.value })
                    }
                    className="min-w-0 flex-1 rounded-md border border-stone-200 px-2 py-1.5 text-sm font-medium outline-none focus:border-stone-400"
                  />
                  <input
                    type="text"
                    value={character.role}
                    maxLength={40}
                    aria-label={`Bible character ${index + 1} role`}
                    placeholder="Role (e.g. hero)"
                    onChange={(event) =>
                      updateCharacter(index, { role: event.target.value })
                    }
                    className="w-44 rounded-md border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => removeCharacter(index)}
                    className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                    aria-label={`Remove ${character.name || "character"}`}
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={character.summary}
                  maxLength={400}
                  aria-label={`Bible character ${index + 1} summary`}
                  placeholder="What to remember about them: what they want, how they talk, how they look, who they're close to."
                  onChange={(event) =>
                    updateCharacter(index, { summary: event.target.value })
                  }
                  className="mt-2 w-full resize-y rounded-md border border-stone-200 px-2 py-1.5 text-xs leading-5 outline-none focus:border-stone-400"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Facts so far
          </h4>
          <button
            type="button"
            onClick={addFact}
            disabled={bible.facts.length >= 40}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Add fact
          </button>
        </div>

        {bible.facts.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-amber-300 bg-white/60 px-3 py-3 text-sm text-stone-500">
            No facts yet. Add what is already true, or use{" "}
            <strong>Add this scene’s facts</strong> in any scene below.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {bible.facts.map((fact, index) => (
              <li key={`bible-fact-${index}`} className="flex items-start gap-2">
                <span className="mt-2 font-mono text-xs text-amber-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <input
                  type="text"
                  value={fact}
                  maxLength={300}
                  aria-label={`Story fact ${index + 1}`}
                  placeholder="Something that's true in your story and must stay true."
                  onChange={(event) => updateFact(index, event.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => removeFact(index)}
                  className="rounded-md px-2 py-1.5 text-xs text-stone-500 hover:bg-white hover:text-stone-800"
                  aria-label={`Remove fact ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
