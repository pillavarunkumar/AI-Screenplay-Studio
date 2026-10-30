import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractJson, parseJsonWithSchema } from "./json";

const schema = z.object({
  title: z.string(),
  score: z.number(),
});

describe("extractJson", () => {
  it("returns a plain JSON object unchanged", () => {
    expect(extractJson('{"title":"A","score":1}')).toBe(
      '{"title":"A","score":1}',
    );
  });

  it("strips markdown fences", () => {
    const raw = '```json\n{"title":"A","score":1}\n```';
    expect(extractJson(raw)).toBe('{"title":"A","score":1}');
  });

  it("strips prose before and after the JSON", () => {
    const raw = 'Sure! Here is your premise:\n{"title":"A","score":1}\nHope it helps.';
    expect(extractJson(raw)).toBe('{"title":"A","score":1}');
  });

  it("supports top-level arrays", () => {
    expect(extractJson("Here you go: [1, 2, 3]")).toBe("[1, 2, 3]");
  });

  it("returns null when there is no JSON", () => {
    expect(extractJson("I cannot help with that.")).toBeNull();
    expect(extractJson("")).toBeNull();
    expect(extractJson("   ")).toBeNull();
  });

  it("returns null for an unterminated object", () => {
    expect(extractJson('{"title":"A"')).toBeNull();
  });
});

describe("parseJsonWithSchema", () => {
  it("parses and validates a good reply", () => {
    const result = parseJsonWithSchema('{"title":"A","score":2}', schema);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ title: "A", score: 2 });
    }
  });

  it("handles fenced JSON", () => {
    const raw = '```json\n{"title":"B","score":9}\n```';
    const result = parseJsonWithSchema(raw, schema);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.title).toBe("B");
  });

  it("reports empty responses", () => {
    const result = parseJsonWithSchema("No JSON here", schema);

    expect(result).toMatchObject({
      ok: false,
      reason: "empty",
      issues: ["Response did not contain a JSON object or array."],
    });
  });

  it("reports invalid JSON", () => {
    const result = parseJsonWithSchema('{"title":"A","score":1,}', schema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_json");
      expect(result.issues[0]).toMatch(/JSON/i);
    }
  });

  it("reports schema mismatches with path-prefixed issues", () => {
    const result = parseJsonWithSchema('{"title":"A"}', schema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("schema_mismatch");
      expect(result.issues).toContain("score: Invalid input: expected number, received undefined");
    }
  });

  it("reports nested paths", () => {
    const nested = z.object({
      explanation: z.object({ whyItWorks: z.string().min(1) }),
    });
    const result = parseJsonWithSchema('{"explanation":{}}', nested);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain("explanation.whyItWorks: Invalid input: expected string, received undefined");
    }
  });

  it("returns the schema output, including transforms", () => {
    const coerced = z.object({ score: z.coerce.number() });
    const result = parseJsonWithSchema('{"score":"7"}', coerced);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.score).toBe(7);
      expect(typeof result.data.score).toBe("number");
    }
  });
});
