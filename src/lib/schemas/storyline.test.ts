import { describe, expect, it } from "vitest";
import {
  StorylineInputSchema,
  StorylineOutputSchema,
} from "./storyline";

const validOutput = {
  correctedIdea:
    "A burned-out nurse inherits her estranged father's lighthouse and finds letters from a woman he never mentioned.",
  corrections: ["Fixed spelling of 'lighthouse'.", "Clarified the father's estrangement."],
  synopsis: {
    setup:
      "Nora, a burned-out nurse, inherits a lighthouse from the father she stopped speaking to years ago.",
    complication:
      "Inside, she finds letters to a woman he never mentioned, and the woman's daughter arrives with a claim on the property.",
    resolution:
      "Nora chooses to share the lighthouse and the truth, giving up the clean break she thought she wanted.",
  },
  whyThisStructure:
    "The setup makes the inheritance feel like an escape. The complication turns the lighthouse into a contested memory. The resolution forces Nora to choose between a tidy exit and an untidy belonging.",
};

const validInput = {
  idea: "a burnt out nurse inherits her fathers lighthouse and finds letters from a woman he never talked about",
};

describe("StorylineInputSchema", () => {
  it("trims and accepts a usable idea", () => {
    const result = StorylineInputSchema.safeParse({
      idea: `   ${validInput.idea}   `,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.idea).toBe(validInput.idea);
    }
  });

  it("rejects a too-short idea", () => {
    const result = StorylineInputSchema.safeParse({ idea: "a light" });
    expect(result.success).toBe(false);
  });
});

describe("StorylineOutputSchema", () => {
  it("accepts a complete storyline", () => {
    const result = StorylineOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it("requires all three synopsis beats", () => {
    const { resolution: _resolution, ...synopsis } = validOutput.synopsis;
    const result = StorylineOutputSchema.safeParse({
      ...validOutput,
      synopsis,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
        "synopsis.resolution",
      );
    }
  });

  it("requires the teaching note", () => {
    const { whyThisStructure: _why, ...withoutWhy } = validOutput;
    expect(StorylineOutputSchema.safeParse(withoutWhy).success).toBe(false);
  });

  it("caps the corrections list", () => {
    const result = StorylineOutputSchema.safeParse({
      ...validOutput,
      corrections: Array.from({ length: 9 }, (_, index) => `fix ${index}`),
    });

    expect(result.success).toBe(false);
  });
});

import { StorylineModelOutputSchema, StorylineOutputSchema as StoredStorylineSchema } from "./storyline";

describe("storyline analysis", () => {
  const base = {
    correctedIdea: "A farmer loses his crop.",
    corrections: [],
    synopsis: { setup: "a", complication: "b", resolution: "c" },
    whyThisStructure: "Because.",
  };
  const analysis = {
    centralQuestion: "Will he sell?",
    want: "To keep his son.",
    need: "To let go.",
    stakes: "The farm.",
    theme: "Love means letting go.",
    strengths: ["The drought setting."],
    toStrengthen: ["Add a deadline."],
  };

  it("keeps older saved storylines without analysis valid", () => {
    expect(StoredStorylineSchema.safeParse(base).success).toBe(true);
  });

  it("requires the analysis from new model output", () => {
    expect(StorylineModelOutputSchema.safeParse(base).success).toBe(false);
    expect(StorylineModelOutputSchema.safeParse({ ...base, analysis }).success).toBe(true);
    expect(StorylineModelOutputSchema.safeParse({ ...base, analysis: { ...analysis, strengths: [] } }).success).toBe(false);
  });
});

import { dropTrivialCorrections } from "./storyline";

describe("dropTrivialCorrections", () => {
  it("keeps fixes that changed meaning and drops capital-letter and punctuation notes", () => {
    const out = dropTrivialCorrections({
      corrections: [
        'Capitalize "Telangana"',
        "Separate sentences with periods",
        "Added a comma after the clause",
        'Clarified "he" to "the farmer"',
        'Fixed spelling of "lighthose" to "lighthouse"',
      ],
    });
    expect(out.corrections).toEqual(['Clarified "he" to "the farmer"', 'Fixed spelling of "lighthose" to "lighthouse"']);
  });
});
