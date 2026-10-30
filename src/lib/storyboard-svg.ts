import type { BoardElement, StoryboardPanel } from "./schemas/storyboard";

export const FRAME_W = 160;
export const FRAME_H = 90;

const esc = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const num = (value: number) => Math.round(value * 10) / 10;

interface Palette {
  wall: string;
  floor: string;
  sky: string;
  ground: string;
  ink: string;
  fill: string;
  accent: string;
  /** Camera-move arrows. */
  arrow: string;
  water: string;
  sun: string;
  /** Frame outline and the number badge. */
  border: string;
}

const DAY: Palette = { wall: "#f1efe9", floor: "#ddd8cc", sky: "#dbeafe", ground: "#e7e5e4", ink: "#292524", fill: "#ffffff", accent: "#f59e0b", arrow: "#dc2626", water: "#60a5fa", sun: "#fde68a", border: "#1c1917" };
const NIGHT: Palette = { wall: "#3b3a46", floor: "#2b2a33", sky: "#1e293b", ground: "#292524", ink: "#e7e5e4", fill: "#57534e", accent: "#fde047", arrow: "#dc2626", water: "#60a5fa", sun: "#fef9c3", border: "#1c1917" };

/** One-colour (zinc grey) version: the same drawing, no hues, so a set of boards looks like one family. */
const MONO_DAY: Palette = { wall: "#e4e4e7", floor: "#d4d4d8", sky: "#d4d4d8", ground: "#a1a1aa", ink: "#27272a", fill: "#fafafa", accent: "#a1a1aa", arrow: "#3f3f46", water: "#71717a", sun: "#fafafa", border: "#52525b" };
const MONO_NIGHT: Palette = { wall: "#52525b", floor: "#3f3f46", sky: "#3f3f46", ground: "#27272a", ink: "#f4f4f5", fill: "#71717a", accent: "#d4d4d8", arrow: "#e4e4e7", water: "#a1a1aa", sun: "#e4e4e7", border: "#52525b" };

/** Draws one element with its base centred on (cx, cy). `u` is the size unit. */
function drawElement(el: BoardElement, cx: number, cy: number, u: number, p: Palette): string {
  const stroke = `stroke="${p.ink}" stroke-width="0.7" stroke-linejoin="round"`;
  switch (el.kind) {
    case "person": {
      const flip = el.facing === "left" ? -1 : 1;
      const head = `<circle cx="${num(cx)}" cy="${num(cy - 3.1 * u)}" r="${num(0.75 * u)}" fill="${p.fill}" ${stroke}/>`;
      const body = `<path d="M${num(cx - 1.1 * u)} ${num(cy)} L${num(cx - 0.8 * u)} ${num(cy - 2.2 * u)} Q${num(cx)} ${num(cy - 2.6 * u)} ${num(cx + 0.8 * u)} ${num(cy - 2.2 * u)} L${num(cx + 1.1 * u)} ${num(cy)} Z" fill="${p.fill}" ${stroke}/>`;
      const face =
        el.facing === "away"
          ? ""
          : el.facing === "camera"
            ? `<circle cx="${num(cx - 0.28 * u)}" cy="${num(cy - 3.2 * u)}" r="${num(0.07 * u)}" fill="${p.ink}"/><circle cx="${num(cx + 0.28 * u)}" cy="${num(cy - 3.2 * u)}" r="${num(0.07 * u)}" fill="${p.ink}"/>`
            : `<circle cx="${num(cx + flip * 0.35 * u)}" cy="${num(cy - 3.2 * u)}" r="${num(0.08 * u)}" fill="${p.ink}"/>`;
      return head + body + face;
    }
    case "table":
      return `<rect x="${num(cx - 2.2 * u)}" y="${num(cy - 1.4 * u)}" width="${num(4.4 * u)}" height="${num(0.5 * u)}" fill="${p.fill}" ${stroke}/><path d="M${num(cx - 1.8 * u)} ${num(cy - 0.9 * u)} V${num(cy)} M${num(cx + 1.8 * u)} ${num(cy - 0.9 * u)} V${num(cy)}" ${stroke} fill="none"/>`;
    case "door":
      return `<rect x="${num(cx - 1.1 * u)}" y="${num(cy - 4 * u)}" width="${num(2.2 * u)}" height="${num(4 * u)}" fill="${p.fill}" ${stroke}/><circle cx="${num(cx + 0.6 * u)}" cy="${num(cy - 2 * u)}" r="${num(0.14 * u)}" fill="${p.ink}"/>`;
    case "window":
      return `<rect x="${num(cx - 1.6 * u)}" y="${num(cy - 2.4 * u)}" width="${num(3.2 * u)}" height="${num(2.4 * u)}" fill="${p.accent}" fill-opacity="0.25" ${stroke}/><path d="M${num(cx)} ${num(cy - 2.4 * u)} V${num(cy)} M${num(cx - 1.6 * u)} ${num(cy - 1.2 * u)} H${num(cx + 1.6 * u)}" ${stroke} fill="none"/>`;
    case "light": {
      const rays = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return `M${num(cx + Math.cos(a) * 1.1 * u)} ${num(cy - 1.2 * u + Math.sin(a) * 1.1 * u)} L${num(cx + Math.cos(a) * 1.7 * u)} ${num(cy - 1.2 * u + Math.sin(a) * 1.7 * u)}`;
      }).join(" ");
      return `<circle cx="${num(cx)}" cy="${num(cy - 1.2 * u)}" r="${num(0.8 * u)}" fill="${p.accent}" ${stroke}/><path d="${rays}" stroke="${p.accent}" stroke-width="0.8" fill="none"/>`;
    }
    case "vehicle":
      return `<path d="M${num(cx - 3 * u)} ${num(cy - 0.8 * u)} L${num(cx - 2.2 * u)} ${num(cy - 1.9 * u)} H${num(cx + 1.4 * u)} L${num(cx + 3 * u)} ${num(cy - 0.8 * u)} V${num(cy - 0.3 * u)} H${num(cx - 3 * u)} Z" fill="${p.fill}" ${stroke}/><circle cx="${num(cx - 1.8 * u)}" cy="${num(cy - 0.2 * u)}" r="${num(0.5 * u)}" fill="${p.ink}"/><circle cx="${num(cx + 1.8 * u)}" cy="${num(cy - 0.2 * u)}" r="${num(0.5 * u)}" fill="${p.ink}"/>`;
    case "tree":
      return `<rect x="${num(cx - 0.25 * u)}" y="${num(cy - 1.6 * u)}" width="${num(0.5 * u)}" height="${num(1.6 * u)}" fill="${p.fill}" ${stroke}/><circle cx="${num(cx)}" cy="${num(cy - 2.6 * u)}" r="${num(1.5 * u)}" fill="${p.fill}" ${stroke}/>`;
    case "building":
      return `<path d="M${num(cx - 1.8 * u)} ${num(cy)} V${num(cy - 5 * u)} H${num(cx + 1.8 * u)} V${num(cy)} Z" fill="${p.fill}" ${stroke}/><path d="M${num(cx - 0.9 * u)} ${num(cy - 4 * u)} h${num(0.5 * u)} M${num(cx + 0.4 * u)} ${num(cy - 4 * u)} h${num(0.5 * u)} M${num(cx - 0.9 * u)} ${num(cy - 2.8 * u)} h${num(0.5 * u)} M${num(cx + 0.4 * u)} ${num(cy - 2.8 * u)} h${num(0.5 * u)}" ${stroke} fill="none"/>`;
    case "water":
      return [0, 1, 2]
        .map((i) => `<path d="M${num(cx - 3 * u)} ${num(cy - i * 0.7 * u)} q${num(0.75 * u)} ${num(-0.5 * u)} ${num(1.5 * u)} 0 t${num(1.5 * u)} 0 t${num(1.5 * u)} 0 t${num(1.5 * u)} 0" stroke="${p.water}" stroke-width="0.8" fill="none"/>`)
        .join("");
    default:
      return `<rect x="${num(cx - 1.1 * u)}" y="${num(cy - 1.6 * u)}" width="${num(2.2 * u)}" height="${num(1.6 * u)}" rx="${num(0.2 * u)}" fill="${p.fill}" ${stroke}/>`;
  }
}

function drawMovement(movement: StoryboardPanel["movement"], p: Palette): string {
  const arrow = (d: string) =>
    `<path d="${d}" stroke="${p.arrow}" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const mid = FRAME_H - 8;
  switch (movement) {
    case "pan-left":
    case "track-left":
      return arrow(`M120 ${mid} H40 M48 ${mid - 4} L40 ${mid} L48 ${mid + 4}`);
    case "pan-right":
    case "track-right":
      return arrow(`M40 ${mid} H120 M112 ${mid - 4} L120 ${mid} L112 ${mid + 4}`);
    case "tilt-up":
      return arrow(`M146 72 V20 M142 28 L146 20 L150 28`);
    case "tilt-down":
      return arrow(`M146 20 V72 M142 64 L146 72 L150 64`);
    case "push-in":
      return arrow(`M6 6 L22 20 M6 6 h7 M6 6 v7 M154 6 L138 20 M154 6 h-7 M154 6 v7 M6 84 L22 70 M6 84 h7 M6 84 v-7 M154 84 L138 70 M154 84 h-7 M154 84 v-7`);
    case "pull-out":
      return arrow(`M22 20 L6 6 M22 20 h-7 M22 20 v-7 M138 20 L154 6 M138 20 h7 M138 20 v-7 M22 70 L6 84 M22 70 h-7 M22 70 v7 M138 70 L154 84 M138 70 h7 M138 70 v7`);
    case "handheld":
      return `<path d="M60 ${mid} l4 -2 l4 4 l4 -4 l4 4 l4 -4 l4 2" stroke="${p.arrow}" stroke-width="1.2" fill="none"/>`;
    default:
      void p;
      return "";
  }
}

const shortLabel = (panel: StoryboardPanel) =>
  `${panel.shotType} · ${panel.cameraAngle}`.slice(0, 34);

/** Self-contained SVG for one storyboard frame (16:9). All model text is escaped. */
export function renderPanelSvg(panel: StoryboardPanel, number: number, options: { mono?: boolean } = {}): string {
  const night = panel.time === "night";
  const p = options.mono ? (night ? MONO_NIGHT : MONO_DAY) : night ? NIGHT : DAY;
  const horizonY = (panel.horizon / 100) * FRAME_H;
  const interior = panel.setting === "interior";

  const background = interior
    ? `<rect width="${FRAME_W}" height="${FRAME_H}" fill="${p.wall}"/><rect y="${num(horizonY)}" width="${FRAME_W}" height="${num(FRAME_H - horizonY)}" fill="${p.floor}"/><path d="M0 ${num(horizonY)} H${FRAME_W}" stroke="${p.ink}" stroke-opacity="0.35" stroke-width="0.5"/>`
    : `<rect width="${FRAME_W}" height="${FRAME_H}" fill="${p.sky}"/><rect y="${num(horizonY)}" width="${FRAME_W}" height="${num(FRAME_H - horizonY)}" fill="${p.ground}"/>${
        `<circle cx="132" cy="14" r="5" fill="${p.sun}"/>`
      }`;

  // Far things first so near things overlap them.
  const elements = [...panel.elements]
    .sort((a, b) => a.y - b.y)
    .map((el) => {
      const u = 1.6 + el.scale * 1.7;
      const cx = (el.x / 100) * FRAME_W;
      const cy = Math.min(FRAME_H + u * 2, (el.y / 100) * FRAME_H);
      const text = el.label.trim();
      // "window" under a window adds nothing; keep names and specific labels.
      const label = text && text.toLowerCase() !== el.kind
        ? `<text x="${num(cx)}" y="${num(Math.min(FRAME_H - 2, cy + 4.5))}" text-anchor="middle" font-size="3.6" font-family="system-ui, sans-serif" fill="${p.ink}" stroke="${p.wall}" stroke-width="0.6" paint-order="stroke">${esc(text.toUpperCase())}</text>`
        : "";
      return drawElement(el, cx, cy, u, p) + label;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_W} ${FRAME_H}" role="img" aria-label="${esc(`Panel ${number}: ${panel.caption}`)}" style="width:100%;height:auto;display:block"><clipPath id="clip-${number}"><rect width="${FRAME_W}" height="${FRAME_H}"/></clipPath><g clip-path="url(#clip-${number})">${background}${elements}${drawMovement(panel.movement, p)}</g><rect width="${FRAME_W}" height="${FRAME_H}" fill="none" stroke="${p.border}" stroke-width="1.2"/><rect width="12" height="9" fill="${p.border}"/><text x="6" y="6.4" text-anchor="middle" font-size="5.5" font-family="system-ui, sans-serif" font-weight="700" fill="#fff">${number}</text><text x="${FRAME_W - 3}" y="6" text-anchor="end" font-size="3.8" font-family="system-ui, sans-serif" font-weight="600" fill="${p.ink}" stroke="${p.wall}" stroke-width="0.7" paint-order="stroke">${esc(shortLabel(panel).toUpperCase())}</text></svg>`;
}
