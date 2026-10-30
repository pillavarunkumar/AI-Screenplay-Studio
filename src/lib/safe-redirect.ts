/** Only allow same-origin relative paths so `?next=` can't become an open redirect. */
export function safeNext(next: string | string[] | undefined, fallback = "/projects"): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
