import { describe, expect, it } from "vitest";
import { StoryboardPanelSchema, StoryboardSchema } from "./schemas/storyboard";
import { renderPanelSvg } from "./storyboard-svg";

const panel = StoryboardPanelSchema.parse({
  shotType: "Wide",
  cameraAngle: "Low angle",
  movement: "push-in",
  setting: "interior",
  time: "night",
  horizon: 60,
  elements: [
    { kind: "person", label: "Nora", x: 33, y: 85, scale: 3, facing: "right" },
    { kind: "table", label: "", x: 70, y: 85, scale: 2, facing: "camera" },
  ],
  caption: "Nora enters the kitchen.",
});

describe("storyboard schema", () => {
  it("repairs sloppy model output instead of rejecting it", () => {
    const parsed = StoryboardSchema.parse({
      panels: [
        {
          shotType: "Close-up",
          movement: "zoom-wildly",
          setting: "underwater",
          time: "dusk",
          horizon: 500,
          elements: [{ kind: "dragon", label: "x", x: 250, y: "abc", scale: 99 }],
          caption: "A face.",
        },
      ],
    });
    const p = parsed.panels[0];
    expect(p.movement).toBe("static");
    expect(p.setting).toBe("interior");
    expect(p.horizon).toBe(55);
    expect(p.elements[0]).toMatchObject({ kind: "object", x: 50, y: 70, scale: 2, facing: "camera" });
  });

  it("requires at least one panel and a caption", () => {
    expect(StoryboardSchema.safeParse({ panels: [] }).success).toBe(false);
    expect(StoryboardPanelSchema.safeParse({ shotType: "Wide", elements: [] }).success).toBe(false);
  });
});

describe("renderPanelSvg", () => {
  it("draws the frame, number, shot tag, labels, and camera move", () => {
    const svg = renderPanelSvg(panel, 3);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(">3</text>");
    expect(svg).toContain("WIDE · LOW ANGLE");
    expect(svg).toContain(">NORA</text>");
    expect(svg).toContain("#dc2626"); // push-in arrows
    expect(svg).toContain("#3b3a46"); // night interior wall
  });

  it("escapes model text", () => {
    const evil = StoryboardPanelSchema.parse({
      shotType: "<script>alert(1)</script>",
      elements: [{ kind: "person", label: '"><img src=x>', x: 10, y: 10, scale: 1 }],
      caption: "<b>x</b>",
    });
    const svg = renderPanelSvg(evil, 1);
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("<img");
    expect(svg).not.toContain("<b>x</b>");
  });
});

import { buildStoryboardHtml } from "./storyboard-export";

describe("buildStoryboardHtml", () => {
  it("numbers panels across scenes and skips scenes without a board", () => {
    const html = buildStoryboardHtml(
      [
        { heading: "int a - day", storyboard: { panels: [panel, panel] } },
        { heading: "ext b - night", storyboard: null },
        { heading: "int c - day", storyboard: { panels: [panel] } },
      ],
      "My <Film>",
    );
    expect(html).toContain("My &lt;Film&gt;");
    expect(html).toContain("INT A - DAY");
    expect(html).not.toContain("EXT B");
    expect(html).toContain(">3</text>");
    expect(html).not.toContain(">4</text>");
  });
});

describe("one-colour boards", () => {
  const hues = /#(?:dc2626|60a5fa|f59e0b|fde047|fde68a|fef9c3|dbeafe|1e293b|ddd8cc|f1efe9)/i;

  it("uses only zinc greys (no red arrows, blue sky, or warm tones)", () => {
    for (const time of ["day", "night"] as const) {
      for (const setting of ["interior", "exterior"] as const) {
        const svg = renderPanelSvg({ ...panel, time, setting, movement: "pan-right", elements: [...panel.elements, { kind: "water", label: "", x: 50, y: 80, scale: 3, facing: "camera" }, { kind: "light", label: "", x: 20, y: 50, scale: 2, facing: "camera" }] }, 1, { mono: true });
        expect(svg).not.toMatch(hues);
      }
    }
  });

  it("matches the banner grey (zinc-600) at night and keeps the colour version unchanged by default", () => {
    expect(renderPanelSvg(panel, 1, { mono: true })).toContain("#52525b");
    expect(renderPanelSvg(panel, 1)).toContain("#dc2626"); // default push-in arrows stay red
  });
});
