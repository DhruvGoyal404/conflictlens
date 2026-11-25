# ConflictLens

See both sides of every merge conflict.

ConflictLens is a small web app for resolving Git merge conflicts visually.
Paste a file that contains conflict markers, and it shows each conflict with
"ours" and "theirs" side by side. Pick a side, keep both, or edit by hand, then
copy the clean, marker-free result. Everything runs in the browser.

## Features

- Parses `<<<<<<<`, `=======`, `>>>>>>>` markers, including the diff3 `|||||||` base section
- Handles multiple conflicts per file and CRLF line endings
- Clear error messages for malformed input (for example an unclosed marker)
- Keep Ours / Keep Theirs / Keep Both / Edit manually for each conflict
- Live resolved output with a progress counter and a Copy button
- Fully client-side: no server API, no database, no network calls

## Run locally

Requires Node.js 22 or newer and npm 10 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (Vitest)
npm run lint
npm run build
```

## Run with Docker

```bash
docker build -t conflictlens .
docker run --rm -p 3000:3000 conflictlens
```

Or with Docker Compose:

```bash
docker compose up --build
```

## Project structure

```
src/
  app/
    layout.tsx               Root layout and page metadata
    page.tsx                 The single-page UI
    globals.css              Tailwind CSS entry
  lib/
    conflictParser.ts        Pure TypeScript conflict parser and output builder
    conflictParser.test.ts   Unit tests for the parser
    config.ts                App name and tagline
    sample.ts                Sample conflicted file for the demo
Dockerfile                   Multi-stage build (deps, build, runtime)
docker-compose.yml           Runs the app on port 3000
```
