// Parses text containing Git conflict markers into plain-text and conflict segments.
// Content is kept as arrays of lines so an empty side ([]) stays distinct from one blank line ([""]).

export type TextSegment = { type: "text"; lines: string[] };

export type ConflictSegment = {
  type: "conflict";
  index: number;
  oursLabel: string;
  theirsLabel: string;
  ours: string[];
  theirs: string[];
  /** Present only for diff3-style conflicts (`||||||| base`). */
  base?: { label: string; lines: string[] };
};

export type Segment = TextSegment | ConflictSegment;

export type ParseResult =
  | { ok: true; segments: Segment[]; conflictCount: number }
  | { ok: false; error: string };

export type Resolution =
  | { kind: "ours" }
  | { kind: "theirs" }
  | { kind: "both" }
  | { kind: "manual"; text: string };

const OURS = "<<<<<<<";
const BASE = "|||||||";
const SEP = "=======";
const THEIRS = ">>>>>>>";

// A marker is exactly 7 chars, optionally followed by a space and a label.
function markerLabel(line: string, marker: string): string | null {
  if (line === marker) return "";
  if (line.startsWith(marker + " ")) return line.slice(marker.length + 1).trim();
  return null;
}

export function parseConflicts(input: string): ParseResult {
  if (input.trim() === "") return { ok: false, error: "Input is empty. Paste a file that contains conflict markers." };

  const lines = input.split(/\r?\n/);
  const segments: Segment[] = [];
  let text: string[] = [];
  let current: ConflictSegment | null = null;
  let state: "text" | "ours" | "base" | "theirs" = "text";
  let openedAt = 0;

  const fail = (lineNo: number, msg: string): ParseResult => ({ ok: false, error: `Line ${lineNo}: ${msg}` });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const n = i + 1;
    const open = markerLabel(line, OURS);
    const base = markerLabel(line, BASE);
    const close = markerLabel(line, THEIRS);
    const isSep = line === SEP;

    if (state === "text") {
      if (open !== null) {
        if (text.length) segments.push({ type: "text", lines: text });
        text = [];
        current = { type: "conflict", index: segments.filter((s) => s.type === "conflict").length, oursLabel: open || "ours", theirsLabel: "", ours: [], theirs: [] };
        state = "ours";
        openedAt = n;
      } else if (close !== null) {
        return fail(n, `found "${THEIRS}" without a matching "${OURS}".`);
      } else {
        // A lone "=======" outside a conflict is ordinary text (e.g. a Markdown heading underline).
        text.push(line);
      }
      continue;
    }

    const c = current!;
    if (open !== null) return fail(n, `found "${OURS}" inside the conflict opened on line ${openedAt}. Nested conflicts are not supported.`);

    if (state === "ours") {
      if (base !== null) {
        c.base = { label: base || "base", lines: [] };
        state = "base";
      } else if (isSep) state = "theirs";
      else if (close !== null) return fail(n, `found "${THEIRS}" before "${SEP}" in the conflict opened on line ${openedAt}.`);
      else c.ours.push(line);
    } else if (state === "base") {
      if (isSep) state = "theirs";
      else if (close !== null) return fail(n, `found "${THEIRS}" before "${SEP}" in the conflict opened on line ${openedAt}.`);
      else c.base!.lines.push(line);
    } else {
      if (close !== null) {
        c.theirsLabel = close || "theirs";
        segments.push(c);
        current = null;
        state = "text";
      } else if (isSep || base !== null) return fail(n, `unexpected "${line}" in the conflict opened on line ${openedAt}.`);
      else c.theirs.push(line);
    }
  }

  if (state !== "text") return fail(openedAt, `conflict marker "${OURS}" is never closed with "${THEIRS}".`);
  if (text.length) segments.push({ type: "text", lines: text });

  return { ok: true, segments, conflictCount: segments.filter((s) => s.type === "conflict").length };
}

function resolvedLines(c: ConflictSegment, r: Resolution | undefined): string[] {
  if (!r) {
    // Unresolved: re-emit the original markers so the output stays honest.
    const base = c.base ? [`${BASE} ${c.base.label}`, ...c.base.lines] : [];
    return [`${OURS} ${c.oursLabel}`, ...c.ours, ...base, SEP, ...c.theirs, `${THEIRS} ${c.theirsLabel}`];
  }
  if (r.kind === "ours") return c.ours;
  if (r.kind === "theirs") return c.theirs;
  if (r.kind === "both") return [...c.ours, ...c.theirs];
  return r.text === "" ? [] : r.text.split(/\r?\n/);
}

/** Builds the output file (LF line endings). Unresolved conflicts keep their markers. */
export function buildOutput(segments: Segment[], resolutions: Record<number, Resolution>): string {
  return segments
    .flatMap((s) => (s.type === "text" ? s.lines : resolvedLines(s, resolutions[s.index])))
    .join("\n");
}
