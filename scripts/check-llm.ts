/**
 * Checks that the configured AI provider works with this app BEFORE you trust it with a story:
 *
 *   npm run llm:check            # connection + story step + one full scene (about 5-8K tokens)
 *   npm run llm:check -- --quick # connection only (a few tokens)
 *   npm run llm:check -- --scene # only the scene step (use after a pause on plans with small per-minute limits)
 *
 * Reads .env.local. Uses LLM_* for the "fast" tier and LLM_WRITING_* (if set) for the "writing" tier.
 */
import { z } from "zod";
import { buildLlmConfig, type LlmTier } from "../src/lib/llm/config";
import { callLlmJson, LlmError } from "../src/lib/llm/core";
import { EXAMPLES } from "../src/lib/examples";
import { autoFormatElement, checkScene } from "../src/lib/screenplay-format";
import { formatScene } from "../src/lib/script-export";
import { writeSceneInput } from "../src/lib/story-context";
import { TASKS } from "../src/lib/tasks";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Environment may already be set.
}

const quick = process.argv.includes("--quick");
const sceneOnly = process.argv.includes("--scene");
const host = (url: string) => new URL(url).host;

function describe(tier: LlmTier) {
  const config = buildLlmConfig(process.env, tier);
  console.log(`  ${tier.padEnd(7)} ${host(config.baseUrl)} · ${config.model} · effort=${config.reasoningEffort ?? "default"} · temperature=${config.temperature ?? "default"}`);
  return config;
}

function fail(step: string, error: unknown): never {
  const e = error as LlmError;
  console.log(`  ✗ ${step}: ${e.code ?? "error"} ${e.message ?? error}`);
  const detail = JSON.stringify(e.details ?? "").slice(0, 400);
  if (detail && detail !== '""') console.log(`    ${detail}`);
  process.exit(1);
}

(async () => {
  console.log("Provider settings (keys are never printed):");
  const fast = describe("fast");
  const writing = describe("writing");

  console.log("\n1. Connection and JSON replies");
  for (const [tier, config] of [["fast", fast], ["writing", writing]] as const) {
    const started = Date.now();
    try {
      const result = await callLlmJson({
        schema: z.object({ ok: z.boolean() }),
        system: 'Reply with ONLY this JSON object: {"ok": true}',
        user: "ping",
        config: { ...config, maxRetries: 0 },
      });
      console.log(`  ✓ ${tier}: ${config.model} answered in ${Date.now() - started}ms (${JSON.stringify(result.data)})`);
    } catch (error) {
      fail(`${tier} connection`, error);
    }
  }
  if (quick) return console.log("\nQuick check passed.");

  if (!sceneOnly) {
  console.log("\n2. Story step (writing tier)");
  try {
    const task = TASKS.storyline;
    const started = Date.now();
    const input = task.input.parse({ idea: "a poor farmer in telangana loses his crop to drought, his son wants to leave for the city, then a stranger offers money for his land" });
    const result = await callLlmJson({ schema: task.output, system: task.system, user: task.buildUser(input), config: writing });
    const data = result.data as { synopsis: Record<string, string>; analysis: { centralQuestion: string; theme: string } };
    console.log(`  ✓ ${Date.now() - started}ms, attempts=${result.meta.attempts}`);
    console.log(`    Resolution: ${data.synopsis.resolution}`);
    console.log(`    Big question: ${data.analysis.centralQuestion}`);
    console.log(`    Message: ${data.analysis.theme}`);
  } catch (error) {
    fail("story step", error);
  }
  }

  console.log("\n3. Scene writing (writing tier), The Last Ferry scene 2");
  try {
    const draft = EXAMPLES[0].draft;
    const target = { ...draft.scenes[1], elements: [] };
    const task = TASKS.writeScene;
    const started = Date.now();
    const input = task.input.parse(writeSceneInput({ ...draft, scenes: [draft.scenes[0], target] }, target));
    const result = await callLlmJson({ schema: task.output, system: task.system, user: task.buildUser(input), config: writing });
    const scene = result.data as { heading: string; elements: { type: never; text: string }[] };
    const elements = scene.elements.map((e) => autoFormatElement({ id: "x", ...e }));
    console.log(`  ✓ ${Date.now() - started}ms, attempts=${result.meta.attempts}, ${elements.length} elements\n`);
    console.log(formatScene({ heading: scene.heading, elements }).replace(/^/gm, "    "));
    const issues = checkScene({ heading: scene.heading, elements });
    console.log(`\n  Format issues: ${issues.length === 0 ? "none" : issues.map((i) => i.message).join("; ")}`);
  } catch (error) {
    fail("scene writing", error);
  }
  console.log("\nAll checks passed. Read the scene above: this is what your writers will get.");
})();
