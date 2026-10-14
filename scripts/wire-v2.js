// Merge v2 files (Learn/Watch/Guided topics) into src/content/<subject>.json for every subject
// that has ../content/<subject>.v2.json. Usage: node scripts/wire-v2.js [subject ...] [--fixture]
// - v2 may be a full subject {id,title,topics,questions?}, a {topics:[...]}, a topics array, or one topic.
// - Topics are merged by id over ../content/number-system.json; questions/masteryThreshold kept unless v2 provides them.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { validateV2Topic, isV2Topic } from '../src/v2check.js'
import { validateSubject } from '../src/grader.js'

const args = process.argv.slice(2)
const fixture = args.includes('--fixture')
const SUBJECTS = ['geometry', 'statistics', 'expressions', 'number-system', 'ratios']
const wanted = args.filter((a) => !a.startsWith('--'))
let totalErr = 0, wired = []
for (const subj of wanted.length ? wanted : SUBJECTS) {
  const r = wireOne(subj)
  if (r === null) continue
  totalErr += r; wired.push(subj)
}
console.log(`wire-v2: wired [${wired.join(', ') || 'none'}]; missing v2 for [${SUBJECTS.filter((x) => !wired.includes(x)).join(', ')}]`)
process.exit(totalErr ? 1 : 0)

function wireOne(subj) {
const real = new URL(`../../content/${subj}.v2.json`, import.meta.url)
const fx = new URL(`../src/content/fixtures/${subj}.v2.fixture.json`, import.meta.url)
const src = existsSync(real) ? real.pathname : fixture && existsSync(fx) ? fx.pathname : null
if (!src) return null

const base = JSON.parse(readFileSync(new URL(`../../content/${subj}.json`, import.meta.url), 'utf8'))
let v2
try { v2 = JSON.parse(readFileSync(src, 'utf8')) } catch (e) { console.error(`wire-v2: ${src} is not valid JSON: ${e.message}`); return 1 }
const topics = Array.isArray(v2) ? v2 : Array.isArray(v2.topics) ? v2.topics : v2.id && (v2.learn || v2.guided) ? [v2] : null
if (!topics) { console.error(`wire-v2: ${subj}: could not find topics`); return 1 }

let errCount = 0
console.log(`wire-v2: ${src}`)
topics.forEach((t, i) => {
  if (!isV2Topic(t)) { console.log(`  topics[${i}](${t?.id}): no learn/guided → will use old view`); return }
  const { errors, warnings } = validateV2Topic(t, i)
  const n = (k) => (Array.isArray(t[k]) ? t[k].length : 0)
  console.log(`  ${t.id}: ${t.learn?.sections?.length ?? 0} learn sections, ${n('examples')} examples, ${n('guided')} guided — ${errors.length} errors, ${warnings.length} warnings`)
  errors.forEach((e) => console.log('    ERROR', e)); warnings.forEach((w) => console.log('    warn ', w))
  errCount += errors.length
})
const baseIds = new Set(base.topics.map((t) => t.id))
for (const t of topics) if (t?.id && !baseIds.has(t.id)) console.log(`  note: topic id "${t.id}" not in existing ${subj}.json (no practice questions will match it unless v2 provides questions)`)

const byId = new Map(topics.map((t) => [t.id, t]))
const merged = {
  ...base,
  ...(Array.isArray(v2) ? {} : Object.fromEntries(Object.entries(v2).filter(([k]) => ['title', 'masteryThreshold'].includes(k)))),
  topics: [...base.topics.map((t) => byId.get(t.id) ?? t), ...topics.filter((t) => !baseIds.has(t.id))],
  questions: !Array.isArray(v2) && Array.isArray(v2.questions) && v2.questions.length ? v2.questions : base.questions,
}
const { subject, warnings } = validateSubject(merged)
const hard = warnings.filter((w) => !w.startsWith('(v2 note)'))
console.log(`  merged: ${subject?.topics.length} topics (${subject?.topics.filter((t) => t.v2).length} v2), ${subject?.questions.length} questions; load warnings: ${hard.length}`)
if (!Array.isArray(v2) && Array.isArray(v2.questions) && JSON.stringify(v2.questions) !== JSON.stringify(base.questions)) console.log(`  note: ${subj}.v2.json questions differ from ${subj}.json — using v2's ${v2.questions.length}`)
writeFileSync(new URL(`../src/content/${subj}.json`, import.meta.url), JSON.stringify(merged, null, 2) + '\n')
console.log(`  wrote src/content/${subj}.json${src === fx.pathname ? ' (FIXTURE — do not ship)' : ''}`)
return errCount
}
