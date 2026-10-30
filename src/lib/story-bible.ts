/** Keep the story bible bounded so prompts and localStorage stay small. */
export const MAX_BIBLE_FACTS = 40;

/**
 * Merge new facts into the bible without duplicating existing knowledge.
 * Comparison is case-insensitive and ignores surrounding whitespace. Existing
 * facts keep their order and text; incoming facts are appended in order until
 * `limit` is reached. The input arrays are never mutated.
 */
export function mergeBibleFacts(
  existing: readonly string[],
  incoming: readonly string[],
  limit: number = MAX_BIBLE_FACTS,
): string[] {
  const next = [...existing];
  const seen = new Set(
    next.map((fact) => fact.trim().toLowerCase()).filter(Boolean),
  );

  for (const fact of incoming) {
    const trimmed = fact.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    if (next.length >= limit) break;

    seen.add(key);
    next.push(trimmed);
  }

  return next;
}
