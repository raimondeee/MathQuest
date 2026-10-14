# MathQuest 🧭

Offline-first, gamified 6th-grade math PWA built for Andrew's iPad. Vite + vanilla TypeScript, no runtime dependencies.

Five subject "worlds" (Geometry and Statistics are flagged **Focus**), each with topics → Lesson, Worked Examples (step-by-step reveal) and 5-question Practice, plus a 10-question Quiz and a 25-question Test per world. XP (10 × difficulty per correct answer), levels, daily streaks, badges and a light CSS celebration. Progress lives in `localStorage`; Settings has export/import (JSON) and reset.

## Run

```bash
npm install
npm run dev          # http://localhost:5173 (also on your LAN via --host)
npm run content      # re-copy ../content/*.json into src/content/
npm run check        # verify every question's answer is gradable by the app grader
npm run build        # dist/ with relative base (./)
```

## Double-click local version (no server)

Opening `index.html` over `file://` shows a white screen (module scripts and hashed assets need a server). Instead:

```bash
npm run build:local   # → ../MathQuest.html (one self-contained file: JS, CSS, all 5 content files, icons inlined)
```

Double-click `MathQuest.html` on Windows or Mac to open it in your browser. It makes no network requests, and the service worker is skipped on `file://`. Progress is saved **per browser**. Progress in the `file://` copy is kept separately from the GitHub Pages site (and from the iPad Home Screen app). Use Settings → Export/Import to move it between them.

## Deploy (GitHub Pages)

```bash
VITE_BASE=/MathQuest/ npm run build
cd dist && touch .nojekyll && git init -q && git add -A && git commit -qm deploy \
  && git push -f https://github.com/raimondeee/MathQuest.git HEAD:gh-pages
```
Pages source: branch `gh-pages`, path `/`. Live at https://raimondeee.github.io/MathQuest/

A service worker (`public/sw.js`) makes the app work offline after the first visit. At build time a small Vite plugin stamps it with a build id (hash of all output files) and the list of files to precache, so each deploy gets a new cache name. The new worker installs, calls `skipWaiting` + `clients.claim`, deletes old caches, and the page reloads once onto the new build. `index.html` is served network-first and hashed assets cache-first. It is never registered on `file://`.

## Content schema

`src/content/<subject>.json` (source of truth: `../content/`):

```ts
{
  id: string, title: string, masteryThreshold?: number,   // default 0.8
  topics: [{ id, title, ccss, lesson /* markdown */, examples: [{ prompt, steps: string[], answer }] }],
  questions: [{
    id, topicId, type: 'mc' | 'numeric', prompt,
    choices?: string[],          // mc only
    answer: number | string,     // mc: 0-based index into choices; numeric: the value
    tolerance?: number,          // numeric, default 0.01
    explanation: string, difficulty: 1 | 2 | 3
  }]
}
```
Optional on questions and worked examples: `figure` — structured data for a generated SVG diagram (`src/figures.ts`), e.g.

```jsonc
{ "kind": "triangle", "base": 12, "height": 5, "unit": "m" }          // also right:true, obtuse:true, unknown:"height"
{ "kind": "parallelogram", "base": 9, "height": 4, "side": 5, "unit": "ft" }
{ "kind": "trapezoid", "top": 6, "bottom": 10, "height": 4, "unit": "in" }
{ "kind": "rect" | "lshape" | "house" | "hexagon", ... }
{ "kind": "prism", "l": 4, "w": 3, "h": 2, "unit": "cm", "cubes": 1 }  // cubes: draw unit-cube grid (1 or 0.5); unknown:"h"
{ "kind": "prismBase", "area": 12, "h": 2.5 } | { "kind": "triPrism", "a": 3, "b": 4, "c": 5, "length": 10 }
{ "kind": "cubeNet", "s": 3 } | { "kind": "pyramidNet", "base": 6, "slant": 5 }
{ "kind": "coord", "points": [[1,1],[6,1],[6,4],[1,4]], "closed": true }
```
Diagrams are drawn roughly to scale; `"fmt": "frac"` shows halves/quarters as ½ ¼ ¾. **Every labeled number must appear in the prompt**: `npm run check` and the app (at load) verify this, and a figure that fails is dropped rather than shown wrong. Geometry figures are generated from the prompts by `node scripts/add-figures.js` (writes `../content/geometry.json` and `src/content/geometry.json`; idempotent).

Files are validated at load; malformed topics/questions are skipped with `console.warn`. Numeric answers accept negatives, decimals and simple fractions (`3/4`); the Unicode minus `−` is normalized to `-`. Lesson markdown supports headings, bold/italic, lists and paragraphs. A topic is **mastered** at ≥ threshold correct over 10+ attempts; a subject is mastered when all its topics are.

## iPad tip: Add to Home Screen

Open the Pages URL in **Safari** → Share button → **Add to Home Screen**. Launch MathQuest from the icon for a full-screen app that works offline. Progress is per-device/per-browser — use Settings → Export to back it up (the Home Screen app and Safari keep separate storage).

## v2 topics: Learn → Watch → Guided → Practice

Every subject now has `../content/<subject>.v2.json`. Check them with `python3 ../tools/validate_v2.py <subject>`, then run `npm run wire-v2`, which validates the files with `src/v2check.js` and merges them into `src/content/<subject>.json`. The merge keeps each subject's 100 practice questions. `npm run content` runs the merge too.

A topic is shown with the v2 screens when it has `learn` or `guided`; otherwise the old Lesson/Examples view is used.

Visuals (`src/visuals.ts`):
- fractionBars, numberLine (dot-plot labels like `"3 ●●●"`, inequality circles `"○ 3"`/`"● 6"`, and a jump to the edge drawn as a solution ray), areaModel (`labels {rows, cols}`, where `"x + 4"` puts one label on each column), placeValue, coordPlane.
- Geometry figures as `{kind:'figure', figure:{...}}` or as the shape kind directly. See `../tools/FIGURE-VISUALS.md`.

Learn text supports markdown tables. Guided inputs accept typed `−`, a/b, mixed numbers and ½-style glyphs, and equivalent fractions (with a nudge to simplify).

The support level fades per topic: 2 problems in a row without help → less support; needing a worked step → more support.
