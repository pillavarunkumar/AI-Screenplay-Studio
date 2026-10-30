import type { Storyboard } from "./schemas/storyboard";
import { renderPanelSvg } from "./storyboard-svg";

const esc = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

interface BoardScene {
  heading: string;
  storyboard?: Storyboard | null;
}

/** Printable storyboard sheets: two frames across, three down, with captions. */
export function buildStoryboardHtml(scenes: readonly BoardScene[], title: string): string {
  let counter = 0;
  const sections = scenes
    .filter((scene) => scene.storyboard && scene.storyboard.panels.length > 0)
    .map((scene) => {
      const panels = scene.storyboard!.panels
        .map((panel) => {
          counter += 1;
          return `<figure>${renderPanelSvg(panel, counter)}<figcaption><b>${esc(panel.shotType)}</b> · ${esc(panel.cameraAngle)}${
            panel.movement !== "static" ? ` · ${esc(panel.movement.replace("-", " "))}` : ""
          }<br>${esc(panel.caption)}${panel.dialogue ? `<br><i>“${esc(panel.dialogue)}”</i>` : ""}</figcaption></figure>`;
        })
        .join("");
      return `<section><h2>${esc(scene.heading.trim().toUpperCase() || "UNTITLED SCENE")}</h2><div class="grid">${panels}</div></section>`;
    })
    .join("");

  const heading = esc(title.trim() || "Storyboard");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${heading} – Storyboard</title><style>
@page { size: 8.5in 11in; margin: 0.6in; }
body { font: 10pt/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1c1917; }
h1 { font-size: 16pt; margin: 0 0 4pt; }
h2 { font-size: 10pt; letter-spacing: .06em; margin: 14pt 0 8pt; break-after: avoid; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
figure { margin: 0; break-inside: avoid; }
figcaption { margin-top: 3pt; font-size: 9pt; }
</style></head><body><h1>${heading}</h1><p>Storyboard</p>${sections || "<p>No storyboard panels yet.</p>"}</body></html>`;
}
