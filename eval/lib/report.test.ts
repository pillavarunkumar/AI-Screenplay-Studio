import { describe, expect, it } from "vitest";
import { renderReport } from "./report";
import { loadSamples } from "./samples";
import {
  scoreNextLines,
  scoreShotList,
  summarizeSample,
  type SampleScore,
} from "./scoring";
import { StubProvider } from "./stub";

async function scoreAll(): Promise<SampleScore[]> {
  const provider = new StubProvider();
  const scores: SampleScore[] = [];

  for (const sample of loadSamples()) {
    scores.push(
      summarizeSample(sample, [
        scoreNextLines(sample, await provider.runNextLines(sample)),
        scoreShotList(sample, await provider.runShotList(sample)),
      ]),
    );
  }

  return scores;
}

describe("eval report formatting", () => {
  it("renders a deterministic summary with all samples", async () => {
    const samples = await scoreAll();
    const markdown = renderReport({ provider: "stub", samples });

    expect(markdown).toBe(renderReport({ provider: "stub", samples }));
    expect(markdown).toContain("# AI Screenplay Studio eval results");
    expect(markdown).toContain("- **Provider:** `stub`");
    expect(markdown).toContain("- **Samples:** 9");
    expect(markdown).toContain("- **Failure cases:** 3");
    expect(markdown).toContain("| 1 | The Lighthouse Letters");
    expect(markdown).toContain("| 9 | Sunday Gravy");
    expect(markdown).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("includes exactly three detailed failure cases", async () => {
    const samples = await scoreAll();
    const markdown = renderReport({ provider: "stub", samples });
    const headings = markdown.match(/^### \d+\. /gm) ?? [];

    expect(headings).toHaveLength(3);
    expect(markdown).toContain("### 1. Signal Lost (`signal-lost`)");
    expect(markdown).toContain(
      "### 2. The Inheritance (`the-inheritance`)",
    );
    expect(markdown).toContain("### 3. Sunday Gravy (`sunday-gravy`)");
    expect(markdown).toContain("**nextLines / technique — 1/5:**");
    expect(markdown).toContain("**shotList / consistency — 1/5:**");
    expect(markdown).toContain("**shotList / emotion — 1/5:**");
  });

  it("prints a model label and handles a run with no failures", async () => {
    const [sample] = await scoreAll();
    const markdown = renderReport({
      provider: "live",
      model: "test-model",
      samples: [{ ...sample, failed: false, reasons: [] }],
    });

    expect(markdown).toContain("(model `test-model`)");
    expect(markdown).toContain("No samples failed in this run.");
    expect(markdown).not.toContain("### 1.");
  });
});
