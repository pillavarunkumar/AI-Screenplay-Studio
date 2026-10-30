# AI Screenplay Studio

AI-native screenwriting workspace: a server-only model client with
timeout/retry/validation, a rate-limited API route, an exhaustive error UI, and
accounts so every generated story is saved and reopenable.

## Roadmap: what is built, and what Phase 2 adds

**Where we are.** The current version is the foundation of **Phase 1** ("Foundation &
Intelligent Screenwriting"). A beginner can already go from a raw idea to a formatted,
translated, storyboarded script, with AI help at every step. But only part of the Phase 1
plan is finished: the five flagship tools (Story Doctor, Corkboard, Beat Sheet, Character
Arc Planner, and a fully professional editor) are partly built or not started. **Phase 2
finishes them.** This section is an honest scorecard, written after checking the code
against the Phase 1 plan.

Legend: ✅ done · 🟡 partly done · ❌ not started

### Phase 1 scorecard

| Phase 1 feature | Status | What exists today | What Phase 2 adds |
| --- | --- | --- | --- |
| **Professional screenplay editor** (P0) | 🟡 | Scene heading, action, character, dialogue, parenthetical and transition lines. Auto-format, a live format check, automatic (CONT'D), and Enter after a character cue adds dialogue. AI: next-line ideas with the technique and why, "Make it sound better" (before/after, accept or keep yours), "Write this scene for me". Autosave. PDF export (title page, industry margins, page numbers in Chrome/Edge) and TXT. | A single continuous page-style editor (today it is one row per line). Tab to change the line type and smart Enter after every line type. Ctrl+S, Ctrl+Z and Ctrl+Shift+Z. On-screen page layout with pagination. Scene-numbering options. A **Shot** line type. Dialogue improvement, scene expansion and emotional enhancement tools. **FDX** (Final Draft) export, and Fountain (the exporter exists but is hidden). |
| **Beat Sheet & story structure** (P0) | ❌ | A simple beginning / middle / end, an AI story analysis (big question, want, need, stakes, message), and the Learn page. | Three structures: **Three-Act, Save the Cat, Hero's Journey**. Generate beats from the story; edit, add and reorder beats. A short "why it matters" for each beat. Generate scenes from beats. Track done and missing beats. Keep beats and scenes in sync. |
| **Visual Corkboard** (P0) | ❌ | Scenes appear as a list of editors. Scenes can be added and removed, but not reordered. | Movable scene cards (number, heading, summary, characters, location, act, emotional intensity, status). Drag and drop, group by act, filter by character. An AI check of what moving a scene does to suspense and pacing. |
| **Character Arc Planner** (P1) | 🟡 | The AI finds every character in the idea (3 to 6, keeping the writer's names) and writes a profile: name and alternates, looks, personality, want, what holds them back, how they talk, and one "how they change" note. Edit or regenerate each card. | The missing fields: **age, external conflict, strengths, weaknesses, fear**. The arc as beginning / middle / end stages, with a visual. AI that watches a character across scenes and flags out-of-character moments. A **relationship map**. |
| **AI Story Doctor** (P0, flagship) | 🟡 | Early pieces only: the story analysis card, the rule-based **Final draft check** (format, missing parts, speakers versus cast, language) with one-click fixes, and the polish and next-line tools. | A dedicated workspace with the six categories (structure, character, dialogue, scene quality, emotional impact, originality). Analyse a story or a finished screenplay. Improve the story, suggest alternative plots, find weak scenes, explain why. **Accept or reject** each suggestion. Feedback must cite the scenes it is about and be backed by evidence, with no invented scores. Saved analyses. |
| **Dashboard & visual identity** | 🟡 | A home page, a **My stories** dashboard (cards, search, sort, progress, rename), a five-step studio, the **Learn** pages (script format, story structure, dialogue, camera, glossary, FAQ) and **Examples**. | The planned sidebar (Story development, Characters, Screenplay, Learn the craft, Export, Settings) around one project dashboard. The planned deep-navy and gold look (today the app uses a warm light theme). |
| **Shared project intelligence** | 🟡 | Accounts, Supabase storage, autosave, and a **story notebook** that goes to the AI with every request, so scenes, characters and facts stay consistent. | Beats, characters and scenes feeding one another through the notebook. AI suggestions and analyses **saved separately** from the writer's text. **Revision history** (today the last save simply wins, and two tabs can overwrite each other). Separate database tables for beats, scenes, characters and script lines (today each story is one saved document). |
| **Export** | 🟡 | PDF (print dialog) and TXT. | FDX, plus a decision on bringing back Fountain and Word. |
| **Validation with writers** | ❌ | None yet. | Test with about 10 writers against the Phase 1 targets (5 complete projects, 7 using the Corkboard, 7 completing a beat sheet, 8 finding Story Doctor useful, 10 exporting a script). These are proposed targets, not results. |

### Already built beyond the Phase 1 plan

These were not in the Phase 1 document, and they stay:

- **Voice storytelling** in 9 languages (browser speech recognition), with the idea tidied up when you stop talking.
- **"Write my whole story"**: from one idea the AI builds the story, finds the cast, plans scenes, writes every scene's script and dialogue, then makes camera plans and storyboards. It only fills in what is missing and never overwrites the writer's work.
- **Camera plans** (shot lists) and **line-art storyboards** per scene, printable as a PDF. (These are simple sketches. AI-generated storyboard *images* stay postponed, see below.)
- **Translation** of the finished script into any language, and **whole-story language conversion** (names, scenes, notes, captions), including Telugu and Telugish.
- A **Final draft check** score, and an **Examples** gallery of three finished stories.
- A choice of AI provider, with a stronger model for the writing steps (see *Choosing the AI provider*).

### Phase 2 plan, in order

This follows the Phase 1 document's own recommendation (the editor first, because everything feeds into the screenplay):

1. **Professional screenplay editor**: continuous page editor, Tab and Enter behaviour, shortcuts, pagination, Shot line, FDX, revision history.
2. **Beat Sheet**: the three structures, beats generated from the story, scenes generated from beats.
3. **Visual Corkboard**: scene cards, drag and drop, acts, filters, and the AI "what does this move change?" check.
4. **Character Arc Planner**: the missing fields, arc stages, consistency monitoring, relationship map.
5. **AI Story Doctor**: the six-category analysis with evidence, accept or reject, and saved analyses.
6. **Connect everything through the story notebook**: beats, scenes, characters and analyses stay in sync; AI suggestions stored apart from the writer's text.
7. **Dashboard redesign, writer testing and release.**

The Phase 1 document estimated about six weeks for the five features. That is a planning estimate, not a promise.

### Launch readiness (needed before a public release)

Not part of the Phase 1 plan, but required before real users arrive:

- Require sign-in for the AI route and add **per-user daily limits** (today anyone can call it, limited only by a per-IP counter).
- **Password reset** and email verification; **account deletion**.
- **Privacy policy and terms** (accounts, and the browser's speech service receives the voice audio).
- Shared rate limiting (today it lives in server memory), security headers, error monitoring, database backups.
- Keep dependencies patched: production dependencies report **0** advisories under `npm audit --omit=dev` (Next 15.5.28, zod 4). The remaining advisories are in the test runner (vitest 2) and affect only its dev server and UI, which this project does not use; vitest 5 needs a Vite upgrade, so it is deferred. Re-run `npm audit` before every release.
- A paid AI plan: free tiers cap how many stories a day the app can write.
- Real-browser, phone and accessibility testing.
- Commit the project to git and run CI on every change.

### Not planned until later phases

Following the Phase 1 document: AI-generated storyboard images, AI voice generation, real-time collaboration, shooting-schedule, budget and location management, festival submissions, and an advanced AI Director.

## Setup

Requires **Node 20.12 or newer**. Built on Next.js 15 (React 18) and zod 4.

```bash
npm install
cp .env.example .env.local   # fill in LLM_API_KEY, LLM_MODEL and (for saving stories) the Supabase keys
npm run dev                  # http://localhost:3000
```

Create the database tables once by running `supabase/schema.sql` in the Supabase SQL
editor (see *Accounts and saved stories*). Before trusting an AI provider with a story,
run `npm run llm:check`.

`.env.local` is gitignored. Never prefix secrets with `NEXT_PUBLIC_` — anything
with that prefix is bundled into client JavaScript.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `LLM_API_KEY` | yes | — | Bearer token for the provider |
| `LLM_MODEL` | yes | — | Model name, e.g. `gpt-4o-mini` |
| `LLM_BASE_URL` | no | `https://api.openai.com/v1` | OpenAI-compatible base URL |
| `LLM_TIMEOUT_MS` | no | `25000` | Per-attempt timeout |
| `LLM_MAX_RETRIES` | no | `1` | Retries after the first attempt (0–2) |
| `LLM_RATE_LIMIT` | no | `30` | Requests per IP per window (a full "write my story" run makes about 25) |
| `LLM_RATE_WINDOW_MS` | no | `60000` | Rate-limit window |
| `LLM_REASONING_EFFORT` | no | — | `low`, `medium`, or `high` for reasoning models (sent as `reasoning_effort`). `low` roughly halves tokens per story |
| `DATABASE_PATH` | no | `./data/studio.db` | SQLite file for accounts and stories (used only when Supabase is not configured) |
| `SUPABASE_URL` | no | — | Supabase project URL. With the secret key, accounts and stories are stored in Supabase |
| `SUPABASE_SECRET_KEY` | no | — | Supabase **secret** key. Server-only; bypasses row-level security, so keep it out of the browser and git |

## Pages

`/` home · `/learn` plain-language screenwriting guides (`src/lib/learn-content.ts`) ·
`/examples` three complete sample stories (`src/lib/examples.ts`, validated by a test) that a
signed-in writer can copy into their account · `/projects` My stories (signed in) ·
`/projects/:id` the studio. The top bar shows My stories (signed in only), Learn, and Examples.

## Choosing the AI provider

Any OpenAI-compatible chat-completions API works (OpenAI, Gemini, Groq, OpenRouter…):
set `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`. Steps that decide quality (story,
characters, scenes, scripts, polish, camera plans) can use a **stronger model** than the
chores (notes, translation, storyboards) via the optional `LLM_WRITING_*` variables
(`API_KEY`, `BASE_URL`, `MODEL`, `REASONING_EFFORT`, `TIMEOUT_MS`, `TEMPERATURE`), which
each fall back to the main setting. Tiers are assigned in `TASK_TIER` (`src/lib/tasks.ts`).
Some newer models reject a custom temperature: set `LLM_TEMPERATURE=default` to stop
sending it.

Before trusting a provider with a story, run `npm run llm:check` (connection, the story
step, and one full scene printed in script format; `-- --quick` checks only the
connection). It prints the provider and model but never the key.

## AI writes everything ("write my story")

For writers who don't want to write themselves, the studio can finish a whole
story from one idea (`src/lib/auto-draft.ts`, button in the studio and in the
Download step's final check):

1. story (`storyline`) → 2. the cast: `castPlan` finds every character the idea
mentions or needs (3–6, keeping the writer's names), then `characters` writes each
one in turn so names stay distinct → 3. scene plan (`scenes`, also sets the
notebook tone) → 4. each scene's full script (`writeScene`: sees the cast's
voices, the notebook, and the previous scenes' endings) plus its new facts
(`bibleSync`) → 5. camera plans (`shotList`) → 6. storyboards (`storyboard`).

It only fills in what is **missing** and saves after every step, so it doubles as
resume after a failure or stop; nothing the writer wrote is replaced. A single
scene can also be written with "✨ Write this scene for me". `writeScene` output
is validated for script flow (cue → dialogue, no orphan dialogue), so the model's
retry repairs mistakes instead of saving them.

**Final draft check** (`src/lib/review-draft.ts`, Download step): story built,
three full characters, every scene written with real dialogue, correct script
format, speakers match the cast, hero and rival both speak, camera plans,
storyboards, notebook filled in, and the script is actually in the chosen
language (checked by Unicode script). It offers "Fix the formatting" and "Fill in
what's missing with AI".

**Usage limits:** a full run is about 20–25 AI calls. Providers cap tokens per
minute and per day (Groq's free tier: 8,000 per minute and 200,000 per day for
gpt-oss-120b, so about two full stories a day). The app waits out short limits
automatically and, for long ones, stops and says when the AI will be ready.
Set `LLM_REASONING_EFFORT=low` to cut tokens substantially.

## Home page, voice, and engagement features

- `/` is the landing page. Writing requires an account: signed-out visitors
  see sign-up/sign-in, signed-in users get a quick-start box that creates a
  saved story immediately. `/studio` just redirects to sign-in or My stories.
- **Voice storytelling**: the mic button uses the browser's Web Speech API
  (Chrome, Edge, Safari; 9 languages; audio goes to the browser vendor's speech
  service, not to this app). Spoken text is appended to the idea with sentence
  casing, and "Refine automatically when I stop talking" runs the existing
  `storyline` task so the copy-edited version appears right away. "Replace my
  text with this refined version" adopts it.
- **Story starters** by genre and "Surprise me" for blank-page moments.
- **Progress tracker** with seven milestones and a "next step" hint.
- **Start flow**: "Start writing" (home page or My stories) opens a popup for
  the project title, creates the story, and opens the studio.
- **Story language**: chosen when a story is created (default English) and
  changeable any time from the "Story language" box. Changing it converts the
  whole story: character names are transliterated into a glossary first, then
  every other field (storyline, cast, bible, scene summaries, script lines,
  shot lists, storyboard captions) is translated in batches with that glossary
  (`src/lib/draft-translate.ts`, `translateStrings` task). Enum values and
  `INT./EXT.` stay English so formatting checks keep working. Finished batches
  are cached so a retry resumes, the story is only replaced when the whole
  conversion succeeds, and an Undo restores the previous version. Every later AI
  call sends the project language and the server appends a language directive
  to the task prompt. Voice typing defaults to the project language when the
  browser supports it.
- **Step 4 · Storyboard**: the `storyboard` task plans 4–8 panels per scene
  (one per shot when the scene has a shot list): shot size, angle, camera move,
  setting, time of day, and where each person or prop stands. The app draws each
  panel as an SVG sketch (`src/lib/storyboard-svg.ts`), so it needs no image
  API; model output is repaired by the schema (bad enums/coordinates fall back
  to safe defaults) and every string is escaped. "Draw N scenes" runs them one
  at a time with automatic rate-limit pauses; Print / Save as PDF produces a
  2×3 storyboard sheet. Boards are saved with the story.
- **Step 5 · Export**: translate the whole script into any language you name
  (one `translateScene` call per scene, character names kept consistent,
  automatic pause on rate limits, resumable after a failure), then download the
  original or translated script as PDF (print dialog → Save as PDF) or
  `.txt`. (The Word `.doc` and Fountain exporters still exist in
  `src/lib/script-export.ts` but are not offered in the UI.) Translations are saved with the story (up to four languages), so they
  survive reloads, and are flagged as out of date if you edit the script afterwards.

## Accounts and saved stories

- **Sign up / sign in** at `/signup` and `/login`. Passwords are hashed with
  scrypt (per-user salt); sessions are random 256-bit tokens in an `httpOnly`,
  `SameSite=Lax` cookie, and only a SHA-256 of the token is stored. Auth routes
  are rate limited per IP, and login takes the same time for unknown emails.
- **My stories** (`/projects`) lists, creates, and deletes saved stories.
  `/projects/:id` is the same studio, autosaving to the server (800ms debounce,
  auto-retry on failure, warns before leaving with unsaved changes). The title is
  editable and defaults to the first sentence of the idea.
- There is no guest mode: the studio is only reachable inside a saved story.
- Every project query is scoped by `user_id`, so another user's id is a 404.
  JSON-only write routes plus SameSite cookies guard against CSRF.
- Storage sits behind one interface (`src/lib/server/store.ts`). With
  `SUPABASE_URL` + `SUPABASE_SECRET_KEY` set it uses **Supabase Postgres**
  (`supabase-store.ts`); otherwise a local SQLite file (`sqlite-store.ts`).
  Setup: run `supabase/schema.sql` once in the Supabase SQL editor (row-level
  security is on with no public policies, so the anon/publishable key cannot
  read anything), then optionally copy existing local data with
  `npx tsx scripts/migrate-sqlite-to-supabase.ts`. A live round-trip test runs
  with `set -a; . ./.env.local; set +a; npx vitest run supabase-store.live`.
  Up to 50 stories per user, 1 MB each.

API: `POST /api/auth/{signup,login,logout}`, `GET /api/auth/me`,
`GET|POST /api/projects`, `GET|PUT|DELETE /api/projects/:id`.

## Product flow (current slice)

1. **Storyline** — the writer pastes a rough idea. `storyline` copy-edits it
   (spelling/clarity, intent preserved), returns a setup → complication →
   resolution synopsis, short correction notes, and a "Why this structure" note.
2. **Characters** — from the corrected idea + synopsis, the writer generates a
   protagonist, antagonist, and supporting character. Each card is a separate
   `characters` call with its own loading skeleton, error state, and retry, so
   one failure never blocks the others. Names come with alternates; all seven
   profile fields are editable and autosave.
3. **Scenes** — `scenes` breaks the synopsis into 3–6 scenes with professional
   headings and a dramatic job for each. Every scene has a screenplay-form
   editor (heading, action, character cues, dialogue) plus:
   - `nextLines`: 2–4 next-line suggestions, each naming the craft technique and
     explaining why it works.
   - `polishScene`: a professional rewrite shown before/after; nothing changes
     until the writer applies it.
   - `shotList`: a text shot list per scene with shot type, camera angle,
     movement, description, and directorial reasoning.
   - `bibleSync`: extracts new, durable facts from the scene into the bible via
     the per-scene **Sync bible with this scene** button.

   The **story bible** (tone, characters, established facts) is visible and
   editable. It is sent with every scene-related request — scene plan, next
   lines, polish, shot lists, and bible sync — so the model stays consistent.
   Finish a scene, then sync it so later scene requests inherit its facts.
   **Download script (.txt)** exports the ordered scenes as a plain-text
   screenplay.

Drafts live in `localStorage` under `ai-screenplay-studio:draft:v1` and are
validated on load. Editable fields may be temporarily blank without making the
saved draft unreadable; model output is still required to be complete. Drafts
saved before Step 3 load with an empty bible and no scenes.

## API

`POST /api/llm` with
`{ "task": "storyline" | "characters" | "premise" | "scenes" | "nextLines" | "polishScene" | "shotList" | "bibleSync", "input": { ... } }`.

Storyline:

```bash
curl -sS http://localhost:3000/api/llm \
  -H 'content-type: application/json' \
  -d '{"task":"storyline","input":{"idea":"a burnt out nurse inherits her fathers lighthouse and finds letters from a woman he never talked about"}}'
```

Character card (one call per card):

```bash
curl -sS http://localhost:3000/api/llm \
  -H 'content-type: application/json' \
  -d '{"task":"characters","input":{"correctedIdea":"A burned-out nurse inherits her father'"'"'s lighthouse.","synopsis":{"setup":"Nora inherits a lighthouse.","complication":"A stranger arrives with a claim.","resolution":"Nora chooses to share it."},"role":"protagonist","existingNames":["Mara"]}}'
```

Scene plan (the bible is required):

```bash
curl -sS http://localhost:3000/api/llm \
  -H 'content-type: application/json' \
  --data-binary @- <<'JSON'
{
  "task": "scenes",
  "input": {
    "correctedIdea": "A burned-out nurse inherits her father's lighthouse.",
    "synopsis": {
      "setup": "Nora inherits a lighthouse.",
      "complication": "A stranger arrives with a claim.",
      "resolution": "Nora chooses to share it."
    },
    "bible": {
      "tone": "wintry and restrained",
      "characters": [
        { "name": "Nora", "role": "Protagonist", "summary": "A burned-out nurse." }
      ],
      "facts": ["Nora's father owned the lighthouse."]
    }
  }
}
JSON
```

`nextLines`, `polishScene`, `shotList`, and `bibleSync` use the same
`correctedIdea` + `synopsis` + `bible` and add a `scene` object with the current
`heading`, `summary`, and `elements` (`[{ "id", "type", "text" }]`).

Success:

```json
{
  "data": { "...": "task-specific, zod-validated output" },
  "meta": { "model": "gpt-4o-mini", "attempts": 1, "latencyMs": 2140 }
}
```

Error:

```json
{
  "error": {
    "code": "llm_timeout",
    "message": "The model call timed out after 25000ms.",
    "attempts": 2,
    "issues": []
  }
}
```

Codes: `invalid_input`, `rate_limited`, `not_configured`, `llm_timeout`,
`llm_bad_json`, `llm_schema_mismatch`, `llm_rate_limited`,
`llm_upstream_error`, `llm_invalid_response`, `internal`.

### Model call pipeline

`src/lib/llm.ts` (server-only) → `src/lib/llm/core.ts`:

1. POST to `{baseUrl}/chat/completions` with `response_format: json_object`.
2. 25s `AbortController` timeout per attempt, one retry.
3. `parseJsonWithSchema` strips fences/prose, parses, validates with zod.
4. Bad JSON or schema mismatch → retry with the validation issues appended so
   the model can repair its own reply.
5. Auth/4xx errors are **not** retried. Timeouts, 429s, 5xx, empty replies are.

Prompts and output schemas are server-owned in `src/lib/tasks.ts`; the zod
shapes they share with the UI live in `src/lib/schemas/`. The client only sends
a task name and input — it can never supply its own schema or prompt.

### Error UI

Every call goes through `useLlmTask` and renders `<ErrorState />`
(`src/components/error-state.tsx`). Its copy map is typed as an exhaustive
`Record<ApiErrorCode, …>`, so adding a code without user-facing copy is a
typecheck error. Retryable failures keep the user's input and offer "Try again".
In the cast grid this state is rendered inside each card, next to that card's
skeleton or fields.

## Tests

```bash
npm test
npm run typecheck
npm run lint
```

Covered: JSON extraction (plain, fenced, prose-wrapped, arrays), invalid JSON,
schema mismatch paths, zod transforms, retry-with-repair, schema mismatch after
both attempts, timeout, 429 retry, no-retry on 401, empty provider message, the
fixed-window rate limiter, storyline/character/scene/story-bible schemas
(missing beats, missing production fields, unknown roles, missing bible,
technique/why notes, empty rewrites, shot-list bounds), task registry wiring
(including bible context in every scene task), saved-draft validation
(including half-generated cards, blank edited fields, persisted scenes, and
loading older drafts that predate the bible), plain-text screenplay export
formatting, story-bible fact merging, and the eval harness (sample parsing,
stub outputs, rubric scoring, failure-case reporting, and live-provider
envelopes/timeouts).

## Eval harness

`eval/storylines.json` contains nine complete sample storylines. The harness runs
`nextLines` and `shotList` on each one and scores technique, emotion, and
story-bible consistency from 1–5:

```bash
npm run eval                                   # deterministic stub, writes eval/results.md
npm run eval -- --provider=live --limit=3      # real model via a running app
```

The stub is deterministic and offline, so CI can run the eval on every push.
The live run needs `npm run dev` in another terminal with `LLM_API_KEY` and
`LLM_MODEL` set; it writes `eval/results.live.md`. See `eval/README.md` for the
rubric, flags, sample flavors, and limitations.

## Known limitations

- Rate limiting is in-memory and per-instance; replace with Redis/Upstash before
  multi-instance deployment.
- `x-forwarded-for` is trusted only behind a proxy that overwrites it.
- No password reset or email verification yet (needs an email provider).
- Saves are last-write-wins; two tabs editing one story can overwrite each
  other.
- SQLite is single-node. Move to Postgres for multi-instance deployments.
- The eval rubric uses deterministic keyword/structure heuristics, not an LLM
  judge; it catches regressions but cannot judge originality or producibility.
