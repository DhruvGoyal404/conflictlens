import { describe, expect, it } from "vitest";
import { buildOutput, parseConflicts, type ConflictSegment, type ParseResult } from "./conflictParser";

function conflicts(r: ParseResult): ConflictSegment[] {
  if (!r.ok) throw new Error(r.error);
  return r.segments.filter((s): s is ConflictSegment => s.type === "conflict");
}

const single = [
  "const a = 1;",
  "<<<<<<< HEAD",
  'const name = "dev";',
  "=======",
  'const name = "student";',
  ">>>>>>> feature/tagline-student",
  "export default name;",
  "",
].join("\n");

describe("parseConflicts", () => {
  it("returns a single text segment when there are no conflicts", () => {
    const r = parseConflicts("line one\nline two\n=======\n");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.conflictCount).toBe(0);
    expect(r.segments).toEqual([{ type: "text", lines: ["line one", "line two", "=======", ""] }]);
  });

  it("parses a single conflict with branch labels", () => {
    const r = parseConflicts(single);
    const [c] = conflicts(r);
    expect(r.ok && r.conflictCount).toBe(1);
    expect(c.oursLabel).toBe("HEAD");
    expect(c.theirsLabel).toBe("feature/tagline-student");
    expect(c.ours).toEqual(['const name = "dev";']);
    expect(c.theirs).toEqual(['const name = "student";']);
    expect(c.base).toBeUndefined();
  });

  it("parses multiple conflicts and keeps text between them", () => {
    const input = ["<<<<<<< HEAD", "a", "=======", "b", ">>>>>>> x", "middle", "<<<<<<< HEAD", "c", "=======", "d", "e", ">>>>>>> x"].join("\n");
    const r = parseConflicts(input);
    const cs = conflicts(r);
    expect(cs.map((c) => c.index)).toEqual([0, 1]);
    expect(cs[1].theirs).toEqual(["d", "e"]);
    expect(r.ok && r.segments.map((s) => s.type)).toEqual(["conflict", "text", "conflict"]);
  });

  it("keeps the diff3 base section", () => {
    const input = ["<<<<<<< HEAD", "ours", "||||||| merged common ancestors", "original", "=======", "theirs", ">>>>>>> topic"].join("\n");
    const [c] = conflicts(parseConflicts(input));
    expect(c.ours).toEqual(["ours"]);
    expect(c.base).toEqual({ label: "merged common ancestors", lines: ["original"] });
    expect(c.theirs).toEqual(["theirs"]);
  });

  it("handles CRLF line endings without leaking \\r", () => {
    const [c] = conflicts(parseConflicts(single.replace(/\n/g, "\r\n")));
    expect(c.oursLabel).toBe("HEAD");
    expect(c.theirsLabel).toBe("feature/tagline-student");
    expect(c.ours).toEqual(['const name = "dev";']);
  });

  it("returns an error for an unclosed marker instead of throwing", () => {
    const r = parseConflicts("x\n<<<<<<< HEAD\nours\n=======\ntheirs\n");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Line 2/);
    expect(r.error).toMatch(/never closed/);
  });

  it("returns an error for a stray closing marker", () => {
    const r = parseConflicts("x\n>>>>>>> topic\n");
    expect(r.ok).toBe(false);
  });

  it("returns an error for empty input", () => {
    expect(parseConflicts("").ok).toBe(false);
    expect(parseConflicts("  \n\n").ok).toBe(false);
  });
});

describe("buildOutput", () => {
  it("applies resolutions and leaves no markers", () => {
    const r = parseConflicts(single);
    if (!r.ok) throw new Error(r.error);
    expect(buildOutput(r.segments, { 0: { kind: "theirs" } })).toBe('const a = 1;\nconst name = "student";\nexport default name;\n');
    expect(buildOutput(r.segments, { 0: { kind: "both" } })).toContain('"dev";\nconst name = "student"');
    expect(buildOutput(r.segments, { 0: { kind: "manual", text: "const name = 'both';" } })).not.toMatch(/<<<<<<<|=======|>>>>>>>/);
  });

  it("keeps markers for unresolved conflicts", () => {
    const r = parseConflicts(single);
    if (!r.ok) throw new Error(r.error);
    expect(buildOutput(r.segments, {})).toBe(single);
  });
});
