/**
 * Providers report "Please try again in 6.675s" (or "850ms", "1m3.2s") inside a
 * rate-limit error. Returns the wait in whole seconds, or undefined if absent.
 */
export function parseRetryAfterSeconds(details: readonly string[] | undefined): number | undefined {
  const text = (details ?? []).join(" ");
  const match = /try again in\s+(?:(\d+)m(?!s))?\s*(?:([\d.]+)(ms|s))?/i.exec(text);
  if (!match || (match[1] === undefined && match[2] === undefined)) return undefined;

  const minutes = match[1] ? Number(match[1]) : 0;
  const amount = match[2] ? Number(match[2]) : 0;
  const seconds = minutes * 60 + (match[3]?.toLowerCase() === "ms" ? amount / 1000 : amount);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}
