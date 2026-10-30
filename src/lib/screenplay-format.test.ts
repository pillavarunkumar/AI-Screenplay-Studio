import { describe, expect, it } from "vitest";
import {
  autoFormatElement,
  checkScene,
  layoutElements,
  normalizeCue,
  normalizeHeading,
  normalizeParenthetical,
  normalizeTransition,
  wrapText,
} from "./screenplay-format";

const el = (type: "action" | "character" | "dialogue" | "parenthetical" | "transition", text: string, id = text) => ({ id, type, text });

describe("normalizeHeading", () => {
  it.each([
    ["int lighthouse kitchen night", "INT. LIGHTHOUSE KITCHEN - NIGHT"],
    ["Ext. Harbor – Dawn", "EXT. HARBOR - DAWN"],
    ["INT./EXT. car, day", "INT./EXT. CAR - DAY"],
    ["interior bedroom - moments later", "INT. BEDROOM - MOMENTS LATER"],
    ["INT. HALL - NIGHT", "INT. HALL - NIGHT"],
    ["  ", ""],
  ])("%s → %s", (input, expected) => {
    expect(normalizeHeading(input)).toBe(expected);
  });
});

describe("element normalisers", () => {
  it("uppercases cues and tidies extensions", () => {
    expect(normalizeCue("nora ( v.o. )")).toBe("NORA (V.O.)");
  });

  it("wraps parentheticals in lowercase parentheses", () => {
    expect(normalizeParenthetical("Quietly")).toBe("(quietly)");
    expect(normalizeParenthetical("((Beat))")).toBe("(beat)");
    expect(normalizeParenthetical("  ")).toBe("");
  });

  it("finishes transitions", () => {
    expect(normalizeTransition("cut to")).toBe("CUT TO:");
    expect(normalizeTransition("fade out")).toBe("FADE OUT.");
    expect(normalizeTransition("DISSOLVE TO:")).toBe("DISSOLVE TO:");
    expect(autoFormatElement(el("action", "keep me")).text).toBe("keep me");
  });
});

describe("layoutElements", () => {
  it("adds CONT'D when a character speaks again after action", () => {
    const out = layoutElements([
      el("character", "Nora", "1"),
      el("dialogue", "Hi.", "2"),
      el("action", "She turns.", "3"),
      el("character", "Nora", "4"),
      el("dialogue", "Wait.", "5"),
    ]);
    expect(out.filter((e) => e.type === "character").map((e) => e.text)).toEqual(["NORA", "NORA (CONT'D)"]);
  });

  it("does not add CONT'D for a different speaker or after a transition", () => {
    const out = layoutElements([
      el("character", "NORA", "1"),
      el("dialogue", "Hi.", "2"),
      el("character", "THEO", "3"),
      el("transition", "cut to", "4"),
      el("character", "THEO", "5"),
    ]);
    expect(out.filter((e) => e.type === "character").map((e) => e.text)).toEqual(["NORA", "THEO", "THEO"]);
  });

  it("drops blank elements", () => {
    expect(layoutElements([el("action", "  ")])).toEqual([]);
  });
});

describe("checkScene", () => {
  it("passes a well-formed scene", () => {
    const scene = {
      heading: "INT. HALL - NIGHT",
      elements: [el("action", "Rain."), el("character", "NORA"), el("parenthetical", "(quietly)"), el("dialogue", "Hi."), el("transition", "CUT TO:")],
    };
    expect(checkScene(scene)).toEqual([]);
  });

  it("flags heading, cue, orphan dialogue, and misplaced parenthetical problems", () => {
    const messages = checkScene({
      heading: "the hall",
      elements: [el("dialogue", "Hello?", "a"), el("character", "nora", "b"), el("parenthetical", "(x)", "c")],
    }).map((issue) => issue.message);

    expect(messages.some((m) => m.includes("Scene heading should read"))).toBe(true);
    expect(messages).toContain("Dialogue needs a character cue above it.");
    expect(messages.some((m) => m.includes("should be in capitals"))).toBe(true);
    expect(messages.some((m) => m.includes("has no dialogue"))).toBe(false);
  });

  it("flags a cue with nothing after it and an empty heading", () => {
    const issues = checkScene({ heading: "", elements: [el("character", "NORA", "a")] });
    expect(issues.map((i) => i.message)).toEqual([
      "Add a scene heading, like INT. LIGHTHOUSE KITCHEN - NIGHT.",
      "“NORA” has no dialogue after the cue.",
    ]);
  });
});

describe("wrapText", () => {
  it("wraps on word boundaries", () => {
    expect(wrapText("one two three four", 9)).toEqual(["one two", "three", "four"]);
  });
});
