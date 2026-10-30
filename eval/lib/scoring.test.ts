import { describe, expect, it } from "vitest";
import { loadSamples } from "./samples";
import {
  scoreNextLines,
  scoreShotList,
  summarizeSample,
  type FeatureScore,
} from "./scoring";
import { StubProvider } from "./stub";

async function scoreSample(id: string) {
  const sample = loadSamples().find((item) => item.id === id);
  if (!sample) throw new Error(`Missing sample ${id}`);

  const provider = new StubProvider();
  const features = [
    scoreNextLines(sample, await provider.runNextLines(sample)),
    scoreShotList(sample, await provider.runShotList(sample)),
  ];

  return summarizeSample(sample, features);
}

function dimensions(feature: FeatureScore) {
  return Object.fromEntries(
    feature.dimensions.map((dimension) => [
      dimension.dimension,
      dimension.score,
    ]),
  );
}

async function scoreAll() {
  const samples = loadSamples();
  const provider = new StubProvider();
  const scores = [];

  for (const sample of samples) {
    scores.push(
      summarizeSample(sample, [
        scoreNextLines(sample, await provider.runNextLines(sample)),
        scoreShotList(sample, await provider.runShotList(sample)),
      ]),
    );
  }

  return scores;
}

describe("rubric scoring", () => {
  it("gives a strong sample full marks on both features", async () => {
    const score = await scoreSample("lighthouse-letters");

    expect(score.overall).toBe(5);
    expect(score.failed).toBe(false);
    expect(score.reasons).toEqual([]);
    for (const feature of score.features) {
      expect(dimensions(feature)).toEqual({
        technique: 5,
        emotion: 5,
        consistency: 5,
      });
    }
  });

  it("fails the generic-technique sample on technique only", async () => {
    const score = await scoreSample("signal-lost");

    expect(score.failed).toBe(true);
    expect(score.overall).toBe(3.7);
    for (const feature of score.features) {
      expect(dimensions(feature)).toEqual({
        technique: 1,
        emotion: 5,
        consistency: 5,
      });
    }
    expect(score.reasons).toEqual([
      "nextLines: technique not named and justified (1/5)",
      "shotList: technique not named and justified (1/5)",
    ]);
  });

  it("fails the contradiction sample on story-bible consistency", async () => {
    const score = await scoreSample("the-inheritance");

    expect(score.failed).toBe(true);
    expect(score.overall).toBe(3.7);
    for (const feature of score.features) {
      expect(dimensions(feature)).toEqual({
        technique: 5,
        emotion: 5,
        consistency: 1,
      });
    }
  });

  it("fails the tone-deaf sample on emotion", async () => {
    const score = await scoreSample("sunday-gravy");

    expect(score.failed).toBe(true);
    expect(score.overall).toBe(3.7);
    for (const feature of score.features) {
      expect(dimensions(feature)).toEqual({
        technique: 5,
        emotion: 1,
        consistency: 5,
      });
    }
  });

  it("keeps exactly three deterministic failure cases", async () => {
    const scores = await scoreAll();

    expect(scores.filter((score) => score.failed).map((score) => score.id)).toEqual(
      ["signal-lost", "the-inheritance", "sunday-gravy"],
    );
    expect(scores.filter((score) => !score.failed)).toHaveLength(6);
  });
});
