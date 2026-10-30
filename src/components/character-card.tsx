"use client";

import { useCallback, useEffect, useRef } from "react";
import { ErrorState } from "@/components/error-state";
import type {
  CharacterProfile,
  CharacterRole,
} from "@/lib/schemas/characters";
import type { StorylineOutput } from "@/lib/schemas/storyline";
import type { CharacterCard as CharacterCardModel } from "@/lib/studio-draft";
import { useLlmTask } from "@/lib/use-llm-task";

interface CharacterCardProps {
  card: CharacterCardModel;
  storyline: StorylineOutput;
  otherNames: string[];
  onChange: (patch: Partial<Omit<CharacterCardModel, "id">>) => void;
  onRemove: () => void;
}

const ROLE_LABEL: Record<CharacterRole, string> = {
  protagonist: "Protagonist",
  antagonist: "Antagonist",
  supporting: "Supporting",
};

const ROLE_STYLE: Record<CharacterRole, string> = {
  protagonist: "bg-emerald-100 text-emerald-800",
  antagonist: "bg-rose-100 text-rose-800",
  supporting: "bg-sky-100 text-sky-800",
};

export function CharacterCard({
  card,
  storyline,
  otherNames,
  onChange,
  onRemove,
}: CharacterCardProps) {
  const { state, run } = useLlmTask<CharacterProfile>("characters");
  const autoStarted = useRef(false);
  const loading = state.status === "loading";
  const profile = card.profile;

  const generate = useCallback(async () => {
    const result = await run({
      correctedIdea: storyline.correctedIdea,
      synopsis: storyline.synopsis,
      role: card.role,
      existingNames: otherNames,
      brief: card.brief,
      suggestedName: card.suggestedName,
    });

    if (result) onChange({ profile: result.data });
  }, [run, storyline, card.role, card.brief, card.suggestedName, otherNames, onChange]);

  // New cards generate themselves once. Retries and replacements are explicit,
  // so a failure in one card never blocks or resets the others.
  useEffect(() => {
    if (autoStarted.current || profile) return;
    autoStarted.current = true;
    void generate();
    // Intentionally once per card; `generate` is refreshed for manual retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProfile = (patch: Partial<CharacterProfile>) => {
    if (!profile) return;
    onChange({ profile: { ...profile, ...patch } });
  };

  const chooseAlternateName = (alternate: string) => {
    if (!profile) return;
    const alternates = [
      profile.name,
      ...profile.alternateNames.filter(
        (name) => name !== alternate && name !== profile.name,
      ),
    ].slice(0, 4);

    updateProfile({ name: alternate, alternateNames: alternates });
  };

  const handleRegenerate = async () => {
    if (
      profile &&
      !window.confirm(
        "Create a new profile? This replaces any changes you made on this card.",
      )
    ) {
      return;
    }
    await generate();
  };

  const handleRemove = () => {
    if (window.confirm(`Remove ${profile?.name ?? "this character"}?`)) {
      onRemove();
    }
  };

  return (
    <article
      aria-busy={loading}
      className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_STYLE[card.role]}`}
          >
            {ROLE_LABEL[card.role]}
          </span>
          {loading && profile ? (
            <span className="text-xs text-stone-500">Creating a new version…</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          aria-label={`Remove ${profile?.name ?? ROLE_LABEL[card.role]}`}
        >
          Remove
        </button>
      </header>

      <div className="mt-4 flex-1 space-y-4">
        {state.status === "error" ? (
          <ErrorState
            error={state.error}
            onRetry={() => {
              void generate();
            }}
          />
        ) : null}

        {!profile && loading ? <ProfileSkeleton /> : null}

        {!profile && !loading && state.status !== "error" ? (
          <p className="text-sm text-stone-500">Writing this character…</p>
        ) : null}

        {profile ? (
          <>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Name
              </span>
              <input
                type="text"
                value={profile.name}
                disabled={loading}
                maxLength={80}
                onChange={(event) =>
                  updateProfile({ name: event.target.value })
                }
                className="mt-1 w-full border-b border-stone-300 bg-transparent pb-1 text-lg font-semibold outline-none focus:border-stone-600 disabled:opacity-60"
              />
            </label>

            {profile.alternateNames.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                <span>Other name ideas:</span>
                {profile.alternateNames.map((alternate) => (
                  <button
                    key={alternate}
                    type="button"
                    disabled={loading}
                    onClick={() => chooseAlternateName(alternate)}
                    className="rounded-full border border-stone-300 px-2 py-0.5 text-stone-700 hover:border-stone-500 hover:bg-stone-50 disabled:opacity-50"
                  >
                    {alternate}
                  </button>
                ))}
              </div>
            ) : null}

            <ProfileField
              label="Looks"
              hint="Age, build, and the look people remember."
              value={profile.physicalDescription}
              disabled={loading}
              onChange={(value) =>
                updateProfile({ physicalDescription: value })
              }
            />
            <ProfileField
              label="Personality"
              hint="Quirks, habits, and how they act under pressure."
              value={profile.personality}
              disabled={loading}
              onChange={(value) => updateProfile({ personality: value })}
            />
            <ProfileField
              label="What they want"
              hint="What they are after, and why it matters right now."
              value={profile.motivation}
              disabled={loading}
              onChange={(value) => updateProfile({ motivation: value })}
            />
            <ProfileField
              label="What holds them back"
              hint="The fear or hurt that gets in the way of what they want."
              value={profile.internalConflict}
              disabled={loading}
              onChange={(value) => updateProfile({ internalConflict: value })}
            />
            <ProfileField
              label="How they talk"
              hint="Favourite words, rhythm, little habits, and a sample line."
              value={profile.voice}
              disabled={loading}
              onChange={(value) => updateProfile({ voice: value })}
            />
            <ProfileField
              label="How they change"
              hint="Where they start and where they end up."
              value={profile.arc}
              disabled={loading}
              onChange={(value) => updateProfile({ arc: value })}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={() => {
                  void handleRegenerate();
                }}
                disabled={loading}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Create a new version
              </button>
              <span className="text-xs text-stone-400">
                Edits save automatically
              </span>
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}

function ProfileField({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
        {label}
      </span>
      <span className="mt-0.5 block text-xs text-stone-400">{hint}</span>
      <textarea
        rows={3}
        value={value}
        disabled={disabled}
        maxLength={800}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 outline-none transition focus:border-stone-400 focus:bg-white focus-visible:ring-2 focus-visible:ring-stone-200 disabled:opacity-60"
      />
    </label>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" className="animate-pulse space-y-4">
      <span className="sr-only">Creating this character…</span>
      <div className="space-y-2">
        <div className="h-3 w-16 rounded bg-stone-200" />
        <div className="h-6 w-40 rounded bg-stone-200" />
        <div className="h-3 w-52 rounded bg-stone-100" />
      </div>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="space-y-2">
          <div className="h-3 w-28 rounded bg-stone-200" />
          <div className="h-3 w-full rounded bg-stone-100" />
          <div className="h-3 w-4/5 rounded bg-stone-100" />
        </div>
      ))}
    </div>
  );
}
