import { describe, expect, it } from "vitest";
import {
  formatScene,
  formatScreenplayElement,
  formatScreenplayHeading,
  formatScript,
} from "./script-export";

const scene = {
  heading: "int. lighthouse kitchen - night",
  elements: [
    {
      id: "1",
      type: "action" as const,
      text: "  The beam sweeps the wall.  ",
    },
    { id: "2", type: "character" as const, text: "nora" },
    { id: "3", type: "dialogue" as const, text: "Nobody's home." },
    { id: "4", type: "action" as const, text: "   " },
    { id: "5", type: "action" as const, text: "The knock lands again." },
  ],
};

describe("script export formatting", () => {
  it("uppercases headings and falls back for blank headings", () => {
    expect(formatScreenplayHeading("  ext. roof - dusk ")).toBe(
      "EXT. ROOF - DUSK",
    );
    expect(formatScreenplayHeading("   ")).toBe("UNTITLED SCENE");
  });

  it("formats character cues and dialogue with screenplay indents", () => {
    expect(
      formatScreenplayElement({ type: "character", text: "nora" }),
    ).toBe(`${" ".repeat(20)}NORA`);
    expect(
      formatScreenplayElement({ type: "dialogue", text: "Nobody's home." }),
    ).toBe(`${" ".repeat(10)}Nobody's home.`);
    expect(formatScreenplayElement({ type: "action", text: "A beat." })).toBe(
      "A beat.",
    );
  });

  it("keeps a cue directly above its dialogue and skips blank elements", () => {
    expect(formatScene(scene)).toBe(
      [
        "INT. LIGHTHOUSE KITCHEN - NIGHT",
        "",
        "The beam sweeps the wall.",
        "",
        `${" ".repeat(20)}NORA`,
        `${" ".repeat(10)}Nobody's home.`,
        "",
        "The knock lands again.",
      ].join("\n"),
    );
  });

  it("joins scenes in order with a title and no trailing whitespace", () => {
    const exported = formatScript(
      [
        scene,
        {
          heading: "EXT. CLIFF - DAWN",
          elements: [{ id: "6", type: "action", text: "The ferry leaves." }],
        },
      ],
      { title: "the lighthouse letters" },
    );

    expect(exported.startsWith("THE LIGHTHOUSE LETTERS\n\n\n")).toBe(true);
    expect(exported).toContain(
      "The knock lands again.\n\n\nEXT. CLIFF - DAWN\n\nThe ferry leaves.",
    );
    expect(exported.endsWith("\n")).toBe(false);
  });

  it("returns an empty string when there is nothing to export", () => {
    expect(formatScript([])).toBe("");
    expect(
      formatScript([{ heading: "", elements: [{ id: "1", type: "action", text: "" }] }]),
    ).toBe("");
  });
});

import { buildPrintHtml, formatFountain } from "./script-export";

describe("fountain and print export", () => {
  const scenes = [
    {
      heading: "int. lighthouse - night",
      elements: [
        { type: "action" as const, text: "Rain hits the glass." },
        { type: "character" as const, text: "Nora" },
        { type: "dialogue" as const, text: "Who left these?" },
      ],
    },
    { heading: "The harbor", elements: [] },
  ];

  it("writes fountain headings, forced headings, and cue/dialogue pairs", () => {
    const out = formatFountain(scenes, { title: "Lighthouse" });
    expect(out).toContain("Title: Lighthouse");
    expect(out).toContain("INT. LIGHTHOUSE - NIGHT\n\nRain hits the glass.\n\n@NORA\nWho left these?");
    expect(out).toContain(".THE HARBOR");
  });

  it("adds Word namespaces for .doc downloads", () => {
    const html = buildPrintHtml([{ heading: "INT. A", elements: [] }], { word: true });
    expect(html).toContain("urn:schemas-microsoft-com:office:word");
    expect(buildPrintHtml([], {})).not.toContain("urn:schemas-microsoft-com");
  });

  it("escapes html in the printable page", () => {
    const html = buildPrintHtml(
      [{ heading: "INT. <b>X</b>", elements: [{ type: "action", text: "a & b" }] }],
      { title: "<script>" },
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("a &amp; b");
    expect(html).toContain("&lt;B&gt;");
  });
});

describe("professional layout", () => {
  const scene = {
    heading: "int lighthouse night",
    elements: [
      { type: "action" as const, text: "Rain hits the glass." },
      { type: "character" as const, text: "nora" },
      { type: "parenthetical" as const, text: "quietly" },
      { type: "dialogue" as const, text: "Who left these letters here, and why now, after all this time?" },
      { type: "action" as const, text: "She sits." },
      { type: "character" as const, text: "Nora" },
      { type: "dialogue" as const, text: "Never mind." },
      { type: "transition" as const, text: "cut to" },
    ],
  };

  it("lays out the text export with industry indents", () => {
    const out = formatScene(scene).split("\n");
    expect(out[0]).toBe("INT. LIGHTHOUSE - NIGHT");
    const cue = out.find((l) => l.trim() === "NORA")!;
    expect(cue.startsWith(" ".repeat(20))).toBe(true);
    expect(out.find((l) => l.trim() === "(quietly)")!.startsWith(" ".repeat(15) + "(")).toBe(true);
    // Dialogue wraps at 35 columns and is indented 10.
    const start = out.findIndex((l) => l.trim() === "(quietly)") + 1;
    const block: string[] = [];
    for (let i = start; out[i]?.trim(); i += 1) block.push(out[i]);
    expect(block.length).toBeGreaterThan(1);
    for (const line of block) {
      expect(line.startsWith(" ".repeat(10))).toBe(true);
      expect(line.trim().length).toBeLessThanOrEqual(35);
    }
    expect(out).toContain(" ".repeat(20) + "NORA (CONT'D)");
    expect(out[out.length - 1]).toBe(" ".repeat(60 - "CUT TO:".length) + "CUT TO:");
  });

  it("keeps cue, parenthetical, and dialogue together in the text export", () => {
    const out = formatScene(scene).split("\n");
    const cueIndex = out.findIndex((l) => l.trim() === "NORA");
    expect(out[cueIndex + 1].trim()).toBe("(quietly)");
    expect(out[cueIndex + 2].trim()).not.toBe("");
  });

  it("writes fountain parentheticals, transitions, and author", () => {
    const out = formatFountain([scene], { title: "Lighthouse", author: "Ada" });
    expect(out).toContain("Author: Ada");
    expect(out).toContain("@NORA\n(quietly)\nWho left");
    expect(out).toContain("> CUT TO:");
    expect(out).toContain("@NORA (CONT'D)");
  });

  it("builds a title page, keeps dialogue blocks together, and escapes the author", () => {
    const html = buildPrintHtml([scene], { title: "Lighthouse", author: "<Ada>" });
    expect(html).toContain('<div class="titlepage"><h1>Lighthouse</h1><p class="by">written by</p>');
    expect(html).toContain("&lt;Ada&gt;");
    expect(html).toContain('<div class="blk"><p class="c">NORA</p><p class="p">(quietly)</p><p class="d">');
    expect(html).toContain('<p class="t">CUT TO:</p>');
    expect(html).toContain("margin: 1in 1in 1in 1.5in");
  });
});
