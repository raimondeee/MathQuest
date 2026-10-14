// Pure grading/validation logic (plain JS so the node check script can import it).
export function parseNumber(raw) {
  if (raw === null || raw === undefined) return NaN
  let s = String(raw).trim().replace(/[\u2212\u2012\u2013\u2014\uFE63\uFF0D]/g, '-').replace(/,/g, '').replace(/\s+/g, '')
  if (s === '') return NaN
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

export function validateSubject(raw) {
  const warnings = []
  if (!raw || typeof raw.id !== 'string' || !Array.isArray(raw.topics) || !Array.isArray(raw.questions)) {
    return { subject: null, warnings: ['malformed subject file'] }
  }
  const topics = raw.topics.filter((t, i) => {
    const ok = t && typeof t.id === 'string' && typeof t.title === 'string'
    if (!ok) warnings.push(`topic #${i} malformed`)
    return ok
  }).map((t) => ({ ...t, lesson: typeof t.lesson === 'string' ? t.lesson : '', examples: Array.isArray(t.examples) ? t.examples.filter((e) => e && typeof e.prompt === 'string' && Array.isArray(e.steps)) : [] }))
  const ids = new Set(topics.map((t) => t.id))
  const questions = raw.questions.filter((q, i) => {
    const err = validateQuestion(q, ids)
    if (err) warnings.push(`question ${q?.id ?? '#' + i}: ${err}`)
    return !err
  })
  const mt = typeof raw.masteryThreshold === 'number' && raw.masteryThreshold > 0 && raw.masteryThreshold <= 1 ? raw.masteryThreshold : 0.8
  return { subject: { id: raw.id, title: raw.title || raw.id, masteryThreshold: mt, topics, questions }, warnings }
}
