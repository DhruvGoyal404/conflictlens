"use client";

import { useMemo, useState } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { buildOutput, parseConflicts, type ConflictSegment, type Resolution } from "@/lib/conflictParser";
import { SAMPLE } from "@/lib/sample";

const btn = "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const btnIdle = "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100";
const btnActive = "border-indigo-600 bg-indigo-600 text-white";

export default function Home() {
  const [input, setInput] = useState("");
  const [resolutions, setResolutions] = useState<Record<number, Resolution>>({});
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => (input ? parseConflicts(input) : null), [input]);
  const conflicts = parsed?.ok ? parsed.segments.filter((s): s is ConflictSegment => s.type === "conflict") : [];
  const resolvedCount = conflicts.filter((c) => resolutions[c.index]).length;
  const allResolved = conflicts.length > 0 && resolvedCount === conflicts.length;
  const output = parsed?.ok ? buildOutput(parsed.segments, resolutions) : "";

  function changeInput(text: string) {
    setInput(text);
    setResolutions({});
    setCopied(false);
  }

  function resolve(index: number, r: Resolution) {
    setResolutions((prev) => ({ ...prev, [index]: r }));
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{APP_NAME}</h1>
        <p className="mt-1 text-zinc-600">{APP_TAGLINE}</p>
      </header>

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="input" className="text-sm font-semibold text-zinc-700">
            Paste a file with conflict markers
          </label>
          <div className="flex gap-2">
            <button className={`${btn} ${btnIdle}`} onClick={() => changeInput(SAMPLE)}>
              Load sample
            </button>
            <button className={`${btn} ${btnIdle}`} onClick={() => changeInput("")} disabled={!input}>
              Clear
            </button>
          </div>
        </div>
        <textarea
          id="input"
          value={input}
          onChange={(e) => changeInput(e.target.value)}
          spellCheck={false}
          placeholder={"<<<<<<< HEAD\nyour change\n=======\ntheir change\n>>>>>>> feature-branch"}
          className="h-56 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        />
        {parsed && !parsed.ok && (
          <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {parsed.error}
          </p>
        )}
        {parsed?.ok && parsed.conflictCount === 0 && (
          <p className="mt-2 text-sm text-zinc-600">No conflict markers found. Nothing to resolve.</p>
        )}
      </section>

      {conflicts.length > 0 && (
        <>
          <section className="mb-8 space-y-6">
            {conflicts.map((c) => (
              <ConflictCard key={c.index} conflict={c} resolution={resolutions[c.index]} onResolve={(r) => resolve(c.index, r)} />
            ))}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-700">
                Resolved output{" "}
                <span className={allResolved ? "text-emerald-600" : "text-amber-600"}>
                  ({resolvedCount} of {conflicts.length} conflicts resolved)
                </span>
              </h2>
              <button className={`${btn} ${btnActive}`} onClick={copy} disabled={!allResolved}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-300 bg-zinc-900 p-3 font-mono text-sm text-zinc-100">{output}</pre>
          </section>
        </>
      )}
    </main>
  );
}

function ConflictCard({
  conflict: c,
  resolution,
  onResolve,
}: {
  conflict: ConflictSegment;
  resolution?: Resolution;
  onResolve: (r: Resolution) => void;
}) {
  const kind = resolution?.kind;
  const choices = [
    { kind: "ours", label: "Keep Ours" },
    { kind: "theirs", label: "Keep Theirs" },
    { kind: "both", label: "Keep Both" },
  ] as const;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-zinc-800">Conflict {c.index + 1}</h3>
        <div className="flex flex-wrap gap-2">
          {choices.map((ch) => (
            <button key={ch.kind} className={`${btn} ${kind === ch.kind ? btnActive : btnIdle}`} onClick={() => onResolve({ kind: ch.kind })}>
              {ch.label}
            </button>
          ))}
          <button
            className={`${btn} ${kind === "manual" ? btnActive : btnIdle}`}
            onClick={() => onResolve({ kind: "manual", text: [...c.ours, ...c.theirs].join("\n") })}
          >
            Edit manually
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Side title="Ours" label={c.oursLabel} lines={c.ours} tone="border-sky-300 bg-sky-50" />
        <Side title="Theirs" label={c.theirsLabel} lines={c.theirs} tone="border-rose-300 bg-rose-50" />
      </div>

      {c.base && (
        <details className="mt-3 text-sm text-zinc-600">
          <summary className="cursor-pointer">Common ancestor ({c.base.label})</summary>
          <pre className="mt-2 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 font-mono">{c.base.lines.join("\n") || "(empty)"}</pre>
        </details>
      )}

      {resolution?.kind === "manual" && (
        <textarea
          aria-label={`Manual resolution for conflict ${c.index + 1}`}
          value={resolution.text}
          onChange={(e) => onResolve({ kind: "manual", text: e.target.value })}
          spellCheck={false}
          className="mt-3 h-28 w-full rounded-md border border-indigo-300 p-2 font-mono text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        />
      )}
    </article>
  );
}

function Side({ title, label, lines, tone }: { title: string; label: string; lines: string[]; tone: string }) {
  return (
    <div className={`rounded-md border ${tone}`}>
      <div className="border-b border-inherit px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600">
        {title} <span className="font-mono normal-case text-zinc-800">{label}</span>
      </div>
      <pre className="overflow-auto p-3 font-mono text-sm text-zinc-900">{lines.join("\n") || "(empty)"}</pre>
    </div>
  );
}
