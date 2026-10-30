import { describe, expect, it } from "vitest";
import {
  CharacterInputSchema,
  CharacterProfileSchema,
} from "./characters";

const validProfile = {
  name: "Nora Vance",
  alternateNames: ["Nora Hale", "Nora Bell"],
  physicalDescription:
    "Late 30s, compact and tired-eyed, with the practical short haircut of someone who works on her feet. Wardrobe is hospital scrubs under a weather-beaten coat.",
  personality:
    "Competent and blunt with strangers, but hoards small kindnesses from patients. Under pressure she becomes hyper-observant and quiet.",
  motivation:
    "She wants to sell the lighthouse quickly and return to a life that asks nothing of her. The letters make leaving feel like another abandonment.",
  internalConflict:
    "She needs to be needed but believes needing anyone is a weakness, so she keeps choosing the clean exit.",
  voice:
    "Short sentences, medical precision, deflects emotion with logistics. Sample: \"I'm not staying. I just came to sign the papers.\"",
  arc:
    "From treating the lighthouse as a transaction to choosing to share it, and letting one stranger see her grief.",
};

const validBrief = {
  correctedIdea: "A burned-out nurse inherits her father's lighthouse.",
  synopsis: {
    setup: "Nora inherits a lighthouse from her estranged father.",
    complication: "A stranger arrives with letters and a claim on the property.",
    resolution: "Nora chooses to share the lighthouse and the truth.",
  },
  role: "protagonist" as const,
  existingNames: ["Mara"],
};

describe("CharacterProfileSchema", () => {
  it("accepts a complete production-style profile", () => {
    expect(CharacterProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it("requires every production field", () => {
    const { voice: _voice, ...withoutVoice } = validProfile;
    const result = CharacterProfileSchema.safeParse(withoutVoice);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
        "voice",
      );
    }
  });

  it("rejects blank required fields in model output", () => {
    const result = CharacterProfileSchema.safeParse({
      ...validProfile,
      voice: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
        "voice",
      );
    }
  });

  it("caps alternate names", () => {
    const result = CharacterProfileSchema.safeParse({
      ...validProfile,
      alternateNames: ["A", "B", "C", "D", "E"],
    });
    expect(result.success).toBe(false);
  });
});

describe("CharacterInputSchema", () => {
  it("accepts a brief for a known role", () => {
    expect(CharacterInputSchema.safeParse(validBrief).success).toBe(true);
  });

  it("defaults existingNames to an empty list", () => {
    const { existingNames: _names, ...withoutNames } = validBrief;
    const result = CharacterInputSchema.safeParse(withoutNames);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.existingNames).toEqual([]);
  });

  it("rejects an unknown role", () => {
    const result = CharacterInputSchema.safeParse({
      ...validBrief,
      role: "lead",
    });
    expect(result.success).toBe(false);
  });

  it("requires all three synopsis beats", () => {
    const result = CharacterInputSchema.safeParse({
      ...validBrief,
      synopsis: { setup: "Only a setup." },
    });
    expect(result.success).toBe(false);
  });
});
