import {
  layoutElements,
  normalizeCue,
  normalizeHeading,
  normalizeParenthetical,
  normalizeTransition,
  wrapText,
  type FormatElement,
} from "./screenplay-format";
import type { Scene, ScriptElement } from "./schemas/scene";

export interface ScriptExportOptions {
  /** Printed on the title page and the first line of the text export. */
  title?: string;
  /** "Written by" line on the title page. */
  author?: string;
  /** Emit Word-flavoured HTML so a `.doc` download opens in Word, LibreOffice, and Google Docs. */
  word?: boolean;
}

type ExportElement = Pick<ScriptElement, "type" | "text"> & { id?: string };
type ExportScene = { heading: string; elements: readonly ExportElement[] };

/*
 * Plain-text layout follows the usual 10-characters-per-inch page: action runs
 * 60 columns from the left margin, dialogue sits 10 in and is 35 wide, the
 * parenthetical is 15 in and 25 wide, the cue is 20 in, transitions are flush
 * right.
 */
const PAGE_WIDTH = 60;
const CUE_INDENT = 20;
const DIALOGUE_INDENT = 10;
const DIALOGUE_WIDTH = 35;
const PAREN_INDENT = 15;
const PAREN_WIDTH = 25;

const indent = (lines: string[], columns: number) =>
  lines.map((line) => " ".repeat(columns) + line).join("\n");

export function formatScreenplayHeading(heading: string): string {
  return normalizeHeading(heading) || "UNTITLED SCENE";
}

/** One element as plain text, already laid out (cue/parenthetical/dialogue indents, wrapping). */
export function formatScreenplayElement(element: ExportElement): string {
  const text = element.text.trim();
  if (!text) return "";

  switch (element.type) {
    case "character":
      return indent([normalizeCue(text)], CUE_INDENT);
    case "dialogue":
      return indent(wrapText(text, DIALOGUE_WIDTH), DIALOGUE_INDENT);
    case "parenthetical":
      return indent(wrapText(normalizeParenthetical(text), PAREN_WIDTH), PAREN_INDENT);
    case "transition": {
      const line = normalizeTransition(text);
      return " ".repeat(Math.max(0, PAGE_WIDTH - line.length)) + line;
    }
    default:
      return wrapText(text, PAGE_WIDTH).join("\n");
  }
}

export function formatScene(scene: ExportScene): string {
  const elements = layoutElements<ExportElement>(scene.elements);
  if (!scene.heading.trim() && elements.length === 0) return "";

  const lines: string[] = [formatScreenplayHeading(scene.heading)];
  let previous: ScriptElement["type"] | null = null;

  for (const element of elements) {
    // Cue → (parenthetical) → dialogue stay together; everything else gets a blank line.
    const glued =
      (previous === "character" && (element.type === "dialogue" || element.type === "parenthetical")) ||
      (previous === "parenthetical" && element.type === "dialogue");
    if (!glued) lines.push("");

    lines.push(formatScreenplayElement(element));
    previous = element.type;
  }

  return lines.join("\n");
}

/** Build a single plain-text screenplay from all scenes, in order. */
export function formatScript(
  scenes: readonly ExportScene[],
  options: ScriptExportOptions = {},
): string {
  const blocks = scenes
    .map((scene) => formatScene(scene))
    .filter((scene) => scene.trim().length > 0);

  const title = options.title?.trim().toUpperCase();
  const author = options.author?.trim();
  const header = title
    ? [" ".repeat(Math.max(0, Math.floor((PAGE_WIDTH - title.length) / 2))) + title, ...(author ? ["", `${" ".repeat(Math.max(0, Math.floor((PAGE_WIDTH - 10 - author.length) / 2)))}Written by ${author}`] : [])].join("\n")
    : "";
  const parts = header ? [header, ...blocks] : blocks;

  return parts.join("\n\n\n").trim();
}

const SCENE_PREFIX = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i;

/** Fountain (.fountain) is plain text that Final Draft, Highland, and WriterDuet import. */
export function formatFountain(
  scenes: readonly ExportScene[],
  options: ScriptExportOptions = {},
): string {
  const blocks: string[] = [];

  for (const scene of scenes) {
    const heading = normalizeHeading(scene.heading);
    const lines: string[] = [];
    if (heading) {
      // A leading "." forces a scene heading when it doesn't start with INT/EXT.
      lines.push(SCENE_PREFIX.test(heading) ? heading : `.${heading}`);
    }

    let previous: ScriptElement["type"] | null = null;
    for (const element of layoutElements<ExportElement>(scene.elements)) {
      const glued =
        (previous === "character" && (element.type === "dialogue" || element.type === "parenthetical")) ||
        (previous === "parenthetical" && element.type === "dialogue");
      if (lines.length > 0 && !glued) lines.push("");

      switch (element.type) {
        case "character":
          lines.push(`@${element.text}`);
          break;
        case "transition":
          lines.push(`> ${element.text}`);
          break;
        default:
          lines.push(element.text);
      }
      previous = element.type;
    }
    if (lines.length > 0) blocks.push(lines.join("\n"));
  }

  const title = options.title?.trim();
  const author = options.author?.trim();
  const meta = [
    title ? `Title: ${title.replace(/\s+/g, " ")}` : "",
    author ? `Author: ${author.replace(/\s+/g, " ")}` : "",
    title ? `Draft date: ${new Date().toISOString().slice(0, 10)}` : "",
  ].filter(Boolean);
  const header = meta.length > 0 ? `${meta.join("\n")}\n\n` : "";
  return `${header}${blocks.join("\n\n")}`.trim() + "\n";
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const CLASS_FOR: Record<ScriptElement["type"], string> = {
  action: "a",
  character: "c",
  dialogue: "d",
  parenthetical: "p",
  transition: "t",
};

/**
 * Printable, industry-style page: US Letter, Courier 12pt at exactly 12pt line
 * height, 1.5in left / 1in right-top-bottom margins, a title page, page numbers
 * (browsers that support @page margin boxes), and cue + dialogue kept together.
 */
export function buildPrintHtml(
  scenes: readonly ExportScene[],
  options: ScriptExportOptions = {},
): string {
  const body = scenes
    .map((scene) => {
      const parts: string[] = [];
      if (scene.heading.trim()) {
        parts.push(`<p class="h">${escapeHtml(formatScreenplayHeading(scene.heading))}</p>`);
      }

      // Group cue + parentheticals + dialogue so they never split across pages.
      let dialogue: string[] = [];
      const flush = () => {
        if (dialogue.length > 0) parts.push(`<div class="blk">${dialogue.join("")}</div>`);
        dialogue = [];
      };

      for (const element of layoutElements<FormatElement>(scene.elements)) {
        const html = `<p class="${CLASS_FOR[element.type]}">${escapeHtml(element.text)}</p>`;
        if (element.type === "character") {
          flush();
          dialogue.push(html);
        } else if ((element.type === "dialogue" || element.type === "parenthetical") && dialogue.length > 0) {
          dialogue.push(html);
        } else {
          flush();
          parts.push(html);
        }
      }
      flush();
      return parts.join("\n");
    })
    .filter(Boolean)
    .join("\n");

  const title = escapeHtml(options.title?.trim() || "Screenplay");
  const author = options.author?.trim();
  const htmlTag = options.word
    ? '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
    : "<html>";
  const titlePage = `<div class="titlepage"><h1>${title}</h1>${
    author ? `<p class="by">written by</p><p class="author">${escapeHtml(author)}</p>` : ""
  }</div>`;

  return `<!doctype html>${htmlTag}<head><meta charset="utf-8"><title>${title}</title><style>
@page { size: 8.5in 11in; margin: 1in 1in 1in 1.5in; @top-right { content: counter(page) "."; font: 12pt "Courier New", Courier, monospace; } }
@page :first { @top-right { content: ""; } }
@page WordSection1 { size: 8.5in 11in; margin: 1in 1in 1in 1.5in; }
div.WordSection1 { page: WordSection1; }
body { font: 12pt/12pt "Courier New", Courier, monospace; color: #000; }
p { margin: 0 0 12pt; white-space: pre-wrap; orphans: 2; widows: 2; }
.titlepage { text-align: center; padding-top: 3.5in; page-break-after: always; }
.titlepage h1 { font: 12pt/12pt "Courier New", Courier, monospace; text-transform: uppercase; text-decoration: underline; margin: 0 0 36pt; }
.by { margin-bottom: 0; }
.h { text-transform: uppercase; margin-top: 24pt; page-break-after: avoid; break-after: avoid; }
.blk { page-break-inside: avoid; break-inside: avoid; }
.c { margin: 0 0 0 2.2in; text-transform: uppercase; page-break-after: avoid; break-after: avoid; }
.p { margin: 0 2.4in 0 1.6in; page-break-after: avoid; break-after: avoid; }
.d { margin: 0 1.5in 12pt 1in; }
.t { text-align: right; text-transform: uppercase; }
.c + .d, .c + .p, .p + .d { margin-top: 0; }
.c { margin-bottom: 0; }
</style></head><body>${options.word ? '<div class="WordSection1">' : ""}${titlePage}\n${body}${options.word ? "</div>" : ""}</body></html>`;
}
