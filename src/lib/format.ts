const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5 minutes ago", "yesterday", then a short date. */
export function timeAgo(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff < 2 * DAY) return "yesterday";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** "varun kumar pilla" → "VP"; one name → first two letters. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters =
    parts.length === 1
      ? Array.from(parts[0]).slice(0, 2)
      : [Array.from(parts[0])[0], Array.from(parts[parts.length - 1])[0]];
  return letters.join("").toUpperCase();
}

/** Solid, earthy cover colours. Full class strings so Tailwind can see them; each holds white text at 4.5:1 or better. */
export const COVERS = [
  "bg-[#b5533c]", // terracotta
  "bg-[#3f6f5f]", // sage pine
  "bg-[#4b5f8a]", // dusty blue
  "bg-[#7a4e6d]", // plum
  "bg-[#9a6b12]", // honey
  "bg-[#5b5247]", // warm taupe
] as const;

/** A stable cover colour per story, so a card looks the same every visit. */
export function coverFor(id: string): (typeof COVERS)[number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVERS[hash % COVERS.length];
}
