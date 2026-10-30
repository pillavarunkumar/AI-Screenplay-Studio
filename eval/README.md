# Eval harness

This harness measures two scene-level features, `nextLines` and `shotList`,
against the same rubric for every sample storyline.

## Run it

```bash
npm run eval
```

The default provider is a **deterministic stub**, so CI makes no network calls.
It scores all nine samples in `eval/storylines.json` and rewrites
`eval/results.md`.

```bash
npm run eval -- --provider=live --limit=3
```

The live run calls a running app's `POST /api/llm` route, which exercises the
real prompt, retry, timeout, and server-side validation path. Start the app with
`LLM_API_KEY` and `LLM_MODEL` set, then run the command in another terminal. It
writes `eval/results.live.md`.

The checked-in `eval/results.md` is from the stub provider. A live result is not
committed because it depends on provider credentials, quota, and model version;
run it yourself when you have a key and use the output as a smoke test.

| Flag | Default | Meaning |
| --- | --- | --- |
| `--provider=stub\|live` | `stub` | Deterministic stub or the running app |
| `--limit=N` | all (live: 3) | Score only the first N samples |
| `--out=path` | `eval/results.md` or `eval/results.live.md` | Output file |
| `EVAL_API_URL` env | `http://127.0.0.1:3000/api/llm` | Live endpoint |
| `EVAL_TIMEOUT_MS` env | `60000` | Live request timeout |

## Rubric

Each feature gets three scores from **1 (missed)** to **5 (strong)**:

1. **Technique named and justified** — `nextLines` must name a specific
   technique in `technique` and explain it in `why`; `shotList` must name one in
   each shot's `reasoning`, with a stated reason.
2. **Matches scene emotion** — output text should use the sample's
   `emotionKeywords` and avoid its `antiEmotionKeywords`.
3. **Consistent with the story bible** — output should reference the sample's
   `expectedMentions` and avoid `forbiddenMentions`, which are contradictions of
   established bible facts.

A sample fails if any dimension is **2 or lower**, or if its overall average is
below **3**. The report lists up to three failure cases in detail.

## Samples and stub flavors

`eval/storylines.json` holds nine complete storylines: corrected idea, synopsis,
story bible, scene, and rubric metadata. Six use the `strong` stub flavor and
should pass. Three deliberately fail one dimension:

| Sample | Stub flavor | Expected failure |
| --- | --- | --- |
| `signal-lost` | `generic-technique` | Names "good writing" and never justifies it |
| `the-inheritance` | `contradiction` | Invents "Ruth's sister" despite the bible |
| `sunday-gravy` | `tone-deaf` | Plays grief for slapstick |

The stub is only a fixture. Live results depend on the model and are not
compared against these expected failures.

## What this does not measure

These are deterministic keyword and structure heuristics, not an LLM judge.
They can catch a missing technique, tonal drift, and a bible contradiction, but
they cannot judge originality, producibility, or whether a joke is funny. Use the
live run as a smoke test and read the actual outputs before trusting a score.

The sample set is small and hand-built, so it is a regression harness rather than
a statistically meaningful benchmark.
