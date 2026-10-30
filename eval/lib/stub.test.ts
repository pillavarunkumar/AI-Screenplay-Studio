import { describe, expect, it } from "vitest";
import {
  NextLinesOutputSchema,
  ShotListOutputSchema,
} from "../../src/lib/schemas/scene";
import { loadSamples } from "./samples";
import { StubProvider } from "./stub";

const samples = loadSamples();

function sampleById(id: string) {
  const found = samples.find((sample) => sample.id === id);
  if (!found) throw new Error(`Missing sample ${id}`);
  return found;
}

describe("StubProvider", () => {
  it("returns schema-valid outputs for every sample and flavor", async () => {
    const provider = new StubProvider();

    for (const sample of samples) {
      const nextLines = await provider.runNextLines(sample);
      const shotList = await provider.runShotList(sample);

      expect(NextLinesOutputSchema.safeParse(nextLines).success).toBe(true);
      expect(ShotListOutputSchema.safeParse(shotList).success).toBe(true);
    }
  });

  it("is deterministic for the same sample", async () => {
    const provider = new StubProvider();
    const sample = sampleById("lighthouse-letters");

    expect(await provider.runNextLines(sample)).toEqual(
      await provider.runNextLines(sample),
    );
    expect(await provider.runShotList(sample)).toEqual(
      await provider.runShotList(sample),
    );
  });

  it("injects the intended contradiction only for the contradiction flavor", async () => {
    const provider = new StubProvider();
    const contradiction = await provider.runNextLines(
      sampleById("the-inheritance"),
    );
    const strong = await provider.runNextLines(
      sampleById("lighthouse-letters"),
    );

    expect(JSON.stringify(contradiction)).toContain("Ruth's sister");
    expect(JSON.stringify(strong)).not.toContain("Ruth's sister");
  });
});
