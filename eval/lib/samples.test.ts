import { describe, expect, it } from "vitest";
import {
  EvalSampleListSchema,
  loadSamples,
  parseSamples,
} from "./samples";

function sample(overrides: Record<string, unknown> = {}) {
  return {
    id: "sample",
    title: "Sample",
    correctedIdea: "A nurse inherits a lighthouse.",
    synopsis: {
      setup: "Nora inherits a lighthouse.",
      complication: "A stranger arrives.",
      resolution: "Nora shares it.",
    },
    bible: {
      tone: "wintry",
      characters: [{ name: "Nora", role: "Protagonist", summary: "A nurse." }],
      facts: ["Nora inherits the lighthouse."],
    },
    scene: {
      heading: "INT. LIGHTHOUSE - NIGHT",
      summary: "Nora finds letters.",
      elements: [{ id: "1", type: "action", text: "The beam turns." }],
    },
    rubric: {
      emotionKeywords: ["grief"],
      antiEmotionKeywords: [],
      expectedMentions: ["lighthouse"],
      forbiddenMentions: [],
    },
    ...overrides,
  };
}

describe("eval sample parsing", () => {
  it("loads the checked-in sample set", () => {
    const samples = loadSamples();

    expect(samples).toHaveLength(9);
    expect(new Set(samples.map((item) => item.id)).size).toBe(9);
    expect(samples.filter((item) => item.stubFlavor === "strong")).toHaveLength(
      6,
    );
    expect(
      samples.filter((item) => item.stubFlavor !== "strong").map((item) => item.id),
    ).toEqual(["signal-lost", "the-inheritance", "sunday-gravy"]);
  });

  it("defaults an unspecified stub flavor to strong", () => {
    const parsed = parseSamples(
      Array.from({ length: 8 }, (_, index) =>
        sample({ id: `sample-${index}` }),
      ),
    );

    expect(parsed[0].stubFlavor).toBe("strong");
  });

  it("rejects fewer than 8 samples", () => {
    const result = EvalSampleListSchema.safeParse([sample()]);

    expect(result.success).toBe(false);
  });

  it("rejects unknown stub flavors", () => {
    const result = EvalSampleListSchema.safeParse([
      ...Array.from({ length: 7 }, (_, index) =>
        sample({ id: `sample-${index}` }),
      ),
      sample({ id: "bad", stubFlavor: "perfect" }),
    ]);

    expect(result.success).toBe(false);
  });

  it("rejects samples without a scene or rubric keywords", () => {
    const result = EvalSampleListSchema.safeParse(
      Array.from({ length: 8 }, (_, index) => {
        const item = sample({ id: `sample-${index}` });
        if (index === 0) {
          return { ...item, scene: undefined };
        }
        return item;
      }),
    );

    expect(result.success).toBe(false);
  });
});
