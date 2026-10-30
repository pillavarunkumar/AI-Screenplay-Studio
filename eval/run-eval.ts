import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LiveProvider } from "./lib/live";
import { renderReport } from "./lib/report";
import type { EvalProvider } from "./lib/provider";
import { loadSamples } from "./lib/samples";
import {
  scoreNextLines,
  scoreShotList,
  summarizeSample,
  type SampleScore,
} from "./lib/scoring";
import { StubProvider } from "./lib/stub";

type ProviderName = "stub" | "live";

interface CliOptions {
  provider: ProviderName;
  limit?: number;
  out: string;
  help: boolean;
}

const DEFAULT_STUB_OUT = fileURLToPath(
  new URL("./results.md", import.meta.url),
);
const DEFAULT_LIVE_OUT = fileURLToPath(
  new URL("./results.live.md", import.meta.url),
);

function usage(): string {
  return [
    "Usage: npm run eval -- [options]",
    "",
    "Options:",
    "  --provider=stub|live   stub (default) is deterministic; live calls /api/llm",
    "  --limit=N              score only the first N samples (live defaults to 3)",
    "  --out=path             output markdown path",
    "  --help                 show this message",
    "",
    "Live runs need the app running with LLM_API_KEY and LLM_MODEL set:",
    "  npm run dev",
    "  npm run eval -- --provider=live --limit=3",
    "",
    "Set EVAL_API_URL to call a different endpoint (default http://127.0.0.1:3000/api/llm).",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  let provider: ProviderName = "stub";
  let limit: number | undefined;
  let out: string | undefined;
  let help = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg.startsWith("--provider=")) {
      const value = arg.slice("--provider=".length);
      if (value !== "stub" && value !== "live") {
        throw new Error(`Unknown provider "${value}". Use stub or live.`);
      }
      provider = value;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--limit must be a positive integer.");
      }
      limit = value;
      continue;
    }

    if (arg.startsWith("--out=")) {
      const value = arg.slice("--out=".length).trim();
      if (!value) throw new Error("--out needs a path.");
      out = value;
      continue;
    }

    throw new Error(`Unknown argument "${arg}".`);
  }

  return {
    provider,
    limit:
      limit ??
      (provider === "live" ? 3 : undefined),
    out:
      out ??
      (provider === "live" ? DEFAULT_LIVE_OUT : DEFAULT_STUB_OUT),
    help,
  };
}

function createProvider(name: ProviderName): EvalProvider {
  return name === "live" ? new LiveProvider() : new StubProvider();
}

async function scoreSamples(
  provider: EvalProvider,
  samples: ReturnType<typeof loadSamples>,
): Promise<SampleScore[]> {
  const scores: SampleScore[] = [];

  for (const sample of samples) {
    const nextLines = await provider.runNextLines(sample);
    const shotList = await provider.runShotList(sample);

    scores.push(
      summarizeSample(sample, [
        scoreNextLines(sample, nextLines),
        scoreShotList(sample, shotList),
      ]),
    );

    process.stdout.write(".");
  }

  process.stdout.write("\n");
  return scores;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  const allSamples = loadSamples();
  const samples =
    options.limit === undefined
      ? allSamples
      : allSamples.slice(0, options.limit);

  if (samples.length === 0) {
    throw new Error("No samples selected.");
  }

  const provider = createProvider(options.provider);

  console.log(
    `AI Screenplay Studio eval — ${provider.name}${
      options.provider === "live" ? " (start the app first)" : " (deterministic, offline)"
    }`,
  );
  console.log(
    `Scoring ${samples.length} sample${samples.length === 1 ? "" : "s"} with nextLines + shotList...`,
  );

  const scores = await scoreSamples(provider, samples);
  const failures = scores.filter((sample) => sample.failed);
  const markdown = renderReport({
    provider: provider.name,
    model: provider.model,
    samples: scores,
  });

  const outPath = resolve(process.cwd(), options.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown, "utf8");

  console.log(
    `Failures: ${failures.length}/${scores.length}${
      failures.length > 0
        ? ` (${failures.map((sample) => sample.id).join(", ")})`
        : ""
    }`,
  );
  console.log(`Wrote ${relative(process.cwd(), outPath) || outPath}`);
}

main().catch((error: unknown) => {
  console.error(`\nEval failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
