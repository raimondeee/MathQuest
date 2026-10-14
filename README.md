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

## Deploy (GitHub Pages)

```bash
VITE_BASE=/MathQuest/ npm run build
cd dist && touch .nojekyll && git init -q && git add -A && git commit -qm deploy \
  && git push -f https://github.com/raimondeee/MathQuest.git HEAD:gh-pages
```
Pages source: branch `gh-pages`, path `/`. Live at https://raimondeee.github.io/MathQuest/

A small service worker (`public/sw.js`) caches the app after the first visit so it works offline. Bump `CACHE` in `sw.js` (and in `main.ts`) to force a refresh of old caches.

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
Files are validated at load; malformed topics/questions are skipped with `console.warn`. Numeric answers accept negatives, decimals and simple fractions (`3/4`); the Unicode minus `−` is normalized to `-`. Lesson markdown supports headings, bold/italic, lists and paragraphs. A topic is **mastered** at ≥ threshold correct over 10+ attempts; a subject is mastered when all its topics are.

## iPad tip: Add to Home Screen

Open the Pages URL in **Safari** → Share button → **Add to Home Screen**. Launch MathQuest from the icon for a full-screen app that works offline. Progress is per-device/per-browser — use Settings → Export to back it up (the Home Screen app and Safari keep separate storage).
