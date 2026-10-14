// Sanity check: every question in every content file is valid and its own answer grades correct.
import { readFileSync, readdirSync } from 'node:fs'
import { validateSubject, grade } from '../src/grader.js'
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
  bad += warnings.length + (total - gradable)
  console.log(`${f}: ${gradable}/${total} gradable, threshold ${subject?.masteryThreshold}`)
  warnings.forEach((w) => console.log('  WARN', w))
}
if (bad) { console.error(`FAIL: ${bad} issue(s)`); process.exit(1) }
console.log('OK: all answers gradable')
