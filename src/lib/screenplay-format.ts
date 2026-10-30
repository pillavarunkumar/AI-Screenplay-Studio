import type { ScriptElementType } from "./schemas/scene";

export interface FormatElement {
  id?: string;
  type: ScriptElementType;
  text: string;
}

export interface FormatIssue {
  /** Element the issue is about; omitted for heading issues. */
  elementId?: string;
  message: string;
}

const EXTENSION = /\s*\((?:V\.?O\.?|O\.?S\.?|O\.?C\.?|CONT'?D|CONT’D|FILTERED|ON RADIO|ON PHONE)\)/gi;

/** `INT.`/`EXT.` prefixes people actually type, mapped to the standard forms. */
const PREFIXES: [RegExp, string][] = [
  [/^(?:INT\.?\s*\/\s*EXT\.?|INT\.?\s*-\s*EXT\.?|I\s*\/\s*E\.?)\s*/i, "INT./EXT. "],
  [/^(?:EXT\.?\s*\/\s*INT\.?)\s*/i, "EXT./INT. "],
  [/^(?:INT(?:ERIOR)?\.?)\s+/i, "INT. "],
  [/^(?:EXT(?:ERIOR)?\.?)\s+/i, "EXT. "],
];

const TIMES = ["DAY", "NIGHT", "MORNING", "AFTERNOON", "EVENING", "DAWN", "DUSK", "LATER", "CONTINUOUS", "MOMENTS LATER", "SAME", "SUNSET", "SUNRISE"];

/** `int lighthouse kitchen night` → `INT. LIGHTHOUSE KITCHEN - NIGHT`. */
export function normalizeHeading(heading: string): string {
  let text = heading.trim().replace(/\s+/g, " ").toUpperCase();
  if (!text) return "";

  for (const [pattern, replacement] of PREFIXES) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      break;
    }
  }

  // Normalise any dash/dot separator before the time of day to " - ".
  text = text.replace(/\s*[–—]\s*/g, " - ");
  const time = [...TIMES].sort((a, b) => b.length - a.length).find((t) => new RegExp(`(?:^|[\\s,.-])${t}$`).test(text));
  if (time && !text.endsWith(` - ${time}`)) {
    const head = text.slice(0, text.length - time.length).replace(/[\s,.-]+$/, "");
    text = `${head} - ${time}`;
  }
  return text;
}

/** Uppercase the name, keep extensions like (V.O.) and (O.S.) tidy. */
export function normalizeCue(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
    .replace(/\(\s*([^)]*?)\s*\)/g, "($1)");
}

export function normalizeParenthetical(text: string): string {
  const inner = text.trim().replace(/^\(+|\)+$/g, "").trim().replace(/\s+/g, " ");
  if (!inner) return "";
  return `(${inner.charAt(0).toLowerCase()}${inner.slice(1)})`;
}

export function normalizeTransition(text: string): string {
  const upper = text.trim().replace(/\s+/g, " ").toUpperCase();
  if (!upper || /[.:]$/.test(upper)) return upper;
  return upper.startsWith("FADE OUT") || upper === "THE END" ? `${upper}.` : `${upper}:`;
}

/** Applies the conventions for each element type without changing meaning. */
export function autoFormatElement<T extends FormatElement>(element: T): T {
  switch (element.type) {
    case "character":
      return { ...element, text: normalizeCue(element.text) };
    case "parenthetical":
      return { ...element, text: normalizeParenthetical(element.text) };
    case "transition":
      return { ...element, text: normalizeTransition(element.text) };
    default:
      return element;
  }
}

/** The speaker's name without extensions: `NORA (V.O.)` → `NORA`. */
export const speakerName = (cue: string) => cue.replace(EXTENSION, "").trim().toUpperCase();

/**
 * Decide what each element shows on the page. A cue gets `(CONT'D)` when the
 * same character speaks again after only action in between.
 */
export function layoutElements<T extends FormatElement>(elements: readonly T[]): T[] {
  const result: T[] = [];
  let lastSpeaker = "";

  for (const element of elements) {
    const text = element.text.trim();
    if (!text) continue;

    if (element.type === "character") {
      const cue = normalizeCue(text);
      const name = speakerName(cue);
      const repeated = name !== "" && name === lastSpeaker && !/CONT'?D/i.test(cue);
      result.push({ ...element, text: repeated ? `${cue} (CONT'D)` : cue });
      lastSpeaker = name;
    } else if (element.type === "parenthetical") {
      result.push({ ...element, text: normalizeParenthetical(text) });
    } else if (element.type === "transition") {
      result.push({ ...element, text: normalizeTransition(text) });
      lastSpeaker = "";
    } else {
      result.push({ ...element, text });
    }
  }
  return result;
}

const HEADING_OK = /^(?:INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.) .+ - .+$/;

/** Format problems a script editor or reader would flag. */
export function checkScene(scene: { heading: string; elements: readonly FormatElement[] }): FormatIssue[] {
  const issues: FormatIssue[] = [];
  const heading = scene.heading.trim();

  if (!heading) {
    issues.push({ message: "Add a scene heading, like INT. LIGHTHOUSE KITCHEN - NIGHT." });
  } else if (!HEADING_OK.test(heading.toUpperCase())) {
    issues.push({
      message: "Scene heading should read INT. or EXT., then the place, a dash, and the time (INT. LIGHTHOUSE - NIGHT).",
    });
  } else if (heading !== heading.toUpperCase()) {
    issues.push({ message: "Scene headings are written in capitals." });
  }

  const visible = scene.elements.filter((element) => element.text.trim());
  visible.forEach((element, index) => {
    const next = visible[index + 1];
    const previous = visible[index - 1];
    const id = element.id;

    if (element.type === "character") {
      if (element.text.trim() !== element.text.trim().toUpperCase()) {
        issues.push({ elementId: id, message: `Character cue “${element.text.trim()}” should be in capitals.` });
      }
      if (!next || (next.type !== "dialogue" && next.type !== "parenthetical")) {
        issues.push({ elementId: id, message: `“${element.text.trim()}” has no dialogue after the cue.` });
      }
    }

    if (element.type === "dialogue" && (!previous || (previous.type !== "character" && previous.type !== "parenthetical"))) {
      issues.push({ elementId: id, message: "Dialogue needs a character cue above it." });
    }

    if (element.type === "parenthetical" && (!previous || (previous.type !== "character" && previous.type !== "dialogue"))) {
      issues.push({ elementId: id, message: "A parenthetical belongs inside dialogue, under the character cue." });
    }

    if (element.type === "transition" && element.text.trim() !== element.text.trim().toUpperCase()) {
      issues.push({ elementId: id, message: "Transitions are written in capitals (CUT TO:)." });
    }

    if (element.type === "action" && element.text.trim().split(/\s+/).length > 90) {
      issues.push({ elementId: id, message: "This action paragraph is long. Break it up so it reads fast on the page." });
    }
  });

  return issues;
}

/** Greedy word-wrap used by the plain-text export. */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + 1 + word.length > width) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    lines.push(line);
  }
  return lines;
}
