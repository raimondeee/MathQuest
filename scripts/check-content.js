// Sanity check: every question in every content file is valid and its own answer grades correct.
import { readFileSync, readdirSync } from 'node:fs'
import { validateSubject, grade } from '../src/grader.js'
import { checkFigure } from '../src/figdata.js'
const dir = new URL('../src/content/', import.meta.url)
let bad = 0
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const raw = JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  const { subject, warnings } = validateSubject(raw)
  const total = raw.questions?.length ?? 0
  let gradable = 0
  for (const q of subject?.questions ?? []) {
    const ok = grade(q, q.type === 'mc' ? q.answer : String(q.answer).replace('-', '\u2212'))
    if (ok) gradable++; else warnings.push(`${q.id}: unicode-minus answer failed`)
  }
  let figs = 0
  const fig = (o, where) => { if (!o.figure) return; figs++; const e = checkFigure(o.figure, o.prompt); if (e) warnings.push(`${where}: figure ${e}`) }
  for (const q of subject?.questions ?? []) fig(q, q.id)
  for (const t of subject?.topics ?? []) t.examples.forEach((e, i) => fig(e, `${t.id} example ${i + 1}`))
  bad += warnings.length + (total - gradable)
  console.log(`${f}: ${gradable}/${total} gradable, threshold ${subject?.masteryThreshold}${figs ? `, ${figs} figures match prompt numbers` : ''}`)
  warnings.forEach((w) => console.log('  WARN', w))
}
if (bad) { console.error(`FAIL: ${bad} issue(s)`); process.exit(1) }
console.log('OK: all answers gradable')
