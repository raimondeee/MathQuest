import { isV2Topic, validateV2Topic } from './v2check.js'
// Pure grading/validation logic (plain JS so the node check script can import it).
const VG = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅐': '1/7', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅑': '1/9', '⅒': '1/10' }
/** "2½" → "2 1/2", "½" → "1/2" */
export const unglyph = (s) => String(s).replace(/(\d)?([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])/g, (_, d, g) => (d ? d + ' ' : '') + VG[g])

export function parseNumber(raw) {
  if (raw === null || raw === undefined) return NaN
  let s = unglyph(raw).trim().replace(/[\u2212\u2012\u2013\u2014\uFE63\uFF0D]/g, '-').replace(/,/g, '').replace(/\s+/g, '')
  if (s === '') return NaN
  const mixed = String(unglyph(raw)).trim().replace(/[\u2212]/g, '-').match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]))
  const frac = s.match(/^(-?)(\d+)\/(\d+)$/)
  if (frac) return (frac[1] ? -1 : 1) * Number(frac[2]) / Number(frac[3])
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN
  return Number(s)
}

export function grade(q, response) {
  if (q.type === 'mc') return Number(response) === Number(q.answer)
  const v = parseNumber(response)
  const a = parseNumber(q.answer)
  if (!Number.isFinite(v) || !Number.isFinite(a)) return false
  const tol = typeof q.tolerance === 'number' && q.tolerance >= 0 ? q.tolerance : 0.01
  return Math.abs(v - a) <= tol + 1e-9
}

/** Returns an error string, or null if the question is valid. */
export function validateQuestion(q, topicIds) {
  if (!q || typeof q !== 'object') return 'not an object'
  if (typeof q.id !== 'string' || !q.id) return 'missing id'
  if (typeof q.prompt !== 'string' || !q.prompt) return 'missing prompt'
  if (!topicIds.has(q.topicId)) return `unknown topicId ${q.topicId}`
  if (q.type === 'mc') {
    if (!Array.isArray(q.choices) || q.choices.length < 2) return 'mc needs choices'
    const i = Number(q.answer)
    if (!Number.isInteger(i) || i < 0 || i >= q.choices.length) return 'mc answer out of range'
    if (!grade(q, i)) return 'mc answer not gradable'
  } else if (q.type === 'numeric') {
    if (!Number.isFinite(parseNumber(q.answer))) return 'numeric answer not a number'
    if (!grade(q, String(q.answer))) return 'numeric answer not gradable'
  } else return `bad type ${q.type}`
  return null
}

const str = (v) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : Array.isArray(v) ? v.join(', ') : String(v))

export function validateSubject(raw) {
  const warnings = []
  if (!raw || typeof raw.id !== 'string' || !Array.isArray(raw.topics) || !Array.isArray(raw.questions)) {
    return { subject: null, warnings: ['malformed subject file'] }
  }
  const topics = raw.topics.filter((t, i) => {
    const ok = t && typeof t.id === 'string' && typeof t.title === 'string'
    if (!ok) warnings.push(`topic #${i} malformed`)
    return ok
  }).map((t, i) => (isV2Topic(t) ? cleanV2(t, i, warnings) : {
    ...t,
    ccss: str(t.ccss), // some files use an array of standards, e.g. ["6.RP.A.1"]
    lesson: str(t.lesson),
    examples: Array.isArray(t.examples)
      ? t.examples.filter((e) => e && typeof e.prompt === 'string' && Array.isArray(e.steps)).map((e) => ({ ...e, steps: e.steps.map(str), answer: str(e.answer) }))
      : [],
  }))

  const ids = new Set(topics.map((t) => t.id))
  const questions = raw.questions.filter((q, i) => {
    const err = validateQuestion(q, ids)
    if (err) warnings.push(`question ${q?.id ?? '#' + i}: ${err}`)
    return !err
  }).map((q) => ({ ...q, explanation: str(q.explanation), choices: q.choices ? q.choices.map(str) : undefined }))
  const mt = typeof raw.masteryThreshold === 'number' && raw.masteryThreshold > 0 && raw.masteryThreshold <= 1 ? raw.masteryThreshold : 0.8
  return { subject: { id: raw.id, title: raw.title || raw.id, masteryThreshold: mt, topics, questions }, warnings }
}

/** Keep a v2 topic, dropping only the parts that fail validation (with console warnings). */
function cleanV2(t, i, warnings) {
  const { errors, warnings: w } = validateV2Topic(t, i)
  w.forEach((x) => warnings.push(`(v2 note) ${x}`))
  const bad = (re) => errors.some((e) => re.test(e))
  const out = { ...t, ccss: str(t.ccss), lesson: '', v2: true }
  if (bad(/\.learn\./) || !t.learn) { if (t.learn) warnings.push(`topic ${t.id}: learn dropped`); out.learn = undefined }
  out.examples = (Array.isArray(t.examples) ? t.examples : []).filter((_, j) => !bad(new RegExp(`\\.examples\\[${j}\\]`)))
  out.guided = (Array.isArray(t.guided) ? t.guided : []).filter((_, j) => !bad(new RegExp(`\\.guided\\[${j}\\]`)))
  errors.forEach((e) => warnings.push(`(v2) ${e} → skipped`))
  return out
}
