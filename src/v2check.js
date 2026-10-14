// v2 ("Learn → Watch → Guided") topic schema: validation + step-input grading.
// Plain JS so scripts/ (node) and the app share it.
import { parseNumber, unglyph } from './grader.js'
import { checkFigure } from './figdata.js'

export const FIGURE_KINDS = ['triangle', 'rect', 'parallelogram', 'trapezoid', 'house', 'lshape', 'hexagon', 'prism', 'prismBase', 'triPrism', 'cubeNet', 'pyramidNet', 'coord']
export const VISUAL_KINDS = ['fractionBars', 'numberLine', 'areaModel', 'placeValue', 'coordPlane', 'figure', ...FIGURE_KINDS]
export const isV2Topic = (t) => !!t && (t.learn != null || t.guided != null)

/** Parse "a/b", "-a/b", "1 1/2" (mixed), integers, decimals → {n, d, value} or null. */
export function parseFraction(raw) {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? { n: raw, d: 1, value: raw, plain: true } : null
  const s = unglyph(raw).trim().replace(/[\u2212\u2012\u2013\u2014\uFE63\uFF0D]/g, '-').replace(/\u2044|÷/g, '/').replace(/\s+/g, ' ')
  let m
  if ((m = s.match(/^(-?)(\d+) (\d+)\s*\/\s*(\d+)$/))) {
    const d = Number(m[4]); if (!d) return null
    const n = (Number(m[2]) * d + Number(m[3])) * (m[1] ? -1 : 1)
    return { n, d, value: n / d, mixed: true }
  }
  if ((m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/))) {
    const n = Number(m[1]), d = Number(m[2]); if (!d) return null
    return { n, d, value: n / d }
  }
  const v = parseNumber(s)
  return Number.isFinite(v) ? { n: v, d: 1, value: v, plain: true } : null
}
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
export const isSimplest = (f) => !f || f.plain || (Number.isInteger(f.n) && Number.isInteger(f.d) && gcd(f.n, f.d) === 1 && f.d !== 1 ? true : f.d === 1)

/**
 * Grade a guided step input.
 * @returns {{ correct: boolean, nudge?: string }}
 */
export function gradeInput(input, response) {
  if (!input) return { correct: false }
  const tol = typeof input.tolerance === 'number' && input.tolerance >= 0 ? input.tolerance : 0.01
  if (input.type === 'choice') {
    const ans = input.answer
    if (typeof ans === 'number') return { correct: Number(response) === ans }
    const picked = Array.isArray(input.choices) ? input.choices[Number(response)] : response
    return { correct: String(picked).trim() === String(ans).trim() }
  }
  if (input.type === 'fraction') {
    const want = parseFraction(input.answer), got = parseFraction(response)
    if (!want || !got) return { correct: false }
    if (Math.abs(want.value - got.value) > 1e-9 + (got.plain ? tol : 0)) return { correct: false }
    const simplest = !got.plain && !got.mixed && gcd(got.n, got.d) !== 1
    if (input.simplest && simplest) return { correct: false, nudge: 'Right value — now simplify it to lowest terms.' }
    if (simplest) return { correct: true, nudge: `Correct! You can simplify that to ${fmtFrac(want)}.` }
    return { correct: true }
  }
  // number
  const want = parseFraction(input.answer), got = parseFraction(response)
  if (!want || !got) return { correct: false }
  return { correct: Math.abs(want.value - got.value) <= tol + 1e-9 }
}
export function fmtFrac(f) {
  if (f.plain) return String(f.value)
  const g = gcd(f.n, f.d) || 1
  let n = f.n / g, d = f.d / g
  if (d < 0) { n = -n; d = -d }
  return d === 1 ? String(n) : `${n}/${d}`
}

// ---------- validation ----------
const isStr = (v) => typeof v === 'string' && v.trim().length > 0
function checkVisual(v, at, errs, warns, ctx = '') {
  if (v == null) return
  if (typeof v !== 'object' || !isStr(v.kind)) { errs.push(`${at}.visual: missing kind`); return }
  if (!VISUAL_KINDS.includes(v.kind)) { warns.push(`${at}.visual: unknown kind "${v.kind}" (will not render)`); return }
  const num = (k, opt) => { if (v[k] === undefined) { if (!opt) errs.push(`${at}.visual(${v.kind}).${k} missing`) } else if (typeof v[k] !== 'number' || !Number.isFinite(v[k])) errs.push(`${at}.visual(${v.kind}).${k} not a number: ${JSON.stringify(v[k])}`) }
  if (v.kind === 'figure' || FIGURE_KINDS.includes(v.kind)) {
    const f = v.kind === 'figure' ? v.figure : v
    if (!f || typeof f !== 'object' || !FIGURE_KINDS.includes(f.kind)) { errs.push(`${at}.visual(figure): figure.kind must be one of ${FIGURE_KINDS.join(', ')}`); return }
    const e = checkFigure(f, ctx)
    if (e) (e.startsWith('label') ? warns : errs).push(`${at}.visual(figure ${f.kind}): ${e}${e.startsWith('label') ? ' (not found in the surrounding text)' : ''}`)
    return
  }
  switch (v.kind) {
    case 'fractionBars':
      num('wholes'); num('parts'); num('shaded', true)
      if (v.groupSize && !(typeof v.groupSize.num === 'number' && typeof v.groupSize.den === 'number' && v.groupSize.den > 0)) errs.push(`${at}.visual.groupSize must be {num,den}`)
      if (v.wholes > 12 || v.parts > 24) warns.push(`${at}.visual(fractionBars) very large (${v.wholes}×${v.parts})`)
      if (typeof v.shaded === 'number' && v.shaded > v.wholes * v.parts) errs.push(`${at}.visual.shaded ${v.shaded} > wholes×parts`)
      break
    case 'numberLine':
      num('min'); num('max'); num('step')
      if (v.step <= 0 || v.max <= v.min) errs.push(`${at}.visual(numberLine) bad range`)
      else if ((v.max - v.min) / v.step > 40) warns.push(`${at}.visual(numberLine) ${Math.round((v.max - v.min) / v.step)} ticks (crowded)`)
      for (const m of v.marks ?? []) if (typeof m.at !== 'number' || m.at < v.min - 1e-9 || m.at > v.max + 1e-9) errs.push(`${at}.visual(numberLine) mark out of range: ${JSON.stringify(m)}`)
      for (const j of v.jumps ?? []) if (typeof j.from !== 'number' || typeof j.to !== 'number' || j.from < v.min - 1e-9 || j.to > v.max + 1e-9 || j.to < v.min - 1e-9 || j.from > v.max + 1e-9) errs.push(`${at}.visual(numberLine) jump out of range: ${JSON.stringify(j)}`)
      break
    case 'areaModel': num('rows'); num('cols'); num('shadeRows', true); num('shadeCols', true); break
    case 'placeValue': if (!(isStr(v.digits) || typeof v.digits === 'number' || Array.isArray(v.digits))) errs.push(`${at}.visual(placeValue).digits missing`); break
    case 'coordPlane': if (!Array.isArray(v.points) || !v.points.every((p) => typeof p.x === 'number' && typeof p.y === 'number')) errs.push(`${at}.visual(coordPlane).points must be [{x,y,label}]`); break
  }
}
function checkInput(inp, at, errs, warns) {
  if (!inp || typeof inp !== 'object') { errs.push(`${at}.input missing`); return }
  if (!['number', 'choice', 'fraction'].includes(inp.type)) { errs.push(`${at}.input.type "${inp.type}" invalid`); return }
  if (inp.answer === undefined || inp.answer === null || inp.answer === '') { errs.push(`${at}.input.answer missing`); return }
  if (inp.type === 'choice') {
    if (!Array.isArray(inp.choices) || inp.choices.length < 2) errs.push(`${at}.input.choices needs 2+`)
    else if (typeof inp.answer === 'number' ? !(inp.answer >= 0 && inp.answer < inp.choices.length) : !inp.choices.map(String).includes(String(inp.answer))) errs.push(`${at}.input.answer ${JSON.stringify(inp.answer)} not in choices`)
    return
  }
  if (!parseFraction(inp.answer)) { errs.push(`${at}.input.answer ${JSON.stringify(inp.answer)} not parseable as ${inp.type}`); return }
  const resp = inp.type === 'fraction' ? String(inp.answer) : String(inp.answer)
  if (!gradeInput(inp, resp).correct) errs.push(`${at}.input.answer does not grade as correct against itself`)
  if (inp.type === 'number' && /\//.test(String(inp.answer))) warns.push(`${at}.input type number but answer looks like a fraction (${inp.answer}); use type fraction`)
}

/** Validate one v2 topic. Returns {errors, warnings} (strings with JSON-ish paths). */
export function validateV2Topic(t, idx = 0) {
  const errs = [], warns = []
  const at = `topics[${idx}](${t?.id ?? '?'})`
  if (!isStr(t?.id)) errs.push(`${at}.id missing`)
  if (!isStr(t?.title)) errs.push(`${at}.title missing`)
  if (!t?.ccss) warns.push(`${at}.ccss missing`)
  // learn
  if (!t.learn || !Array.isArray(t.learn.sections) || !t.learn.sections.length) errs.push(`${at}.learn.sections missing/empty`)
  else t.learn.sections.forEach((s, i) => { if (!isStr(s?.text)) errs.push(`${at}.learn.sections[${i}].text missing`); checkVisual(s?.visual, `${at}.learn.sections[${i}]`, errs, warns, s?.text) })
  if (t.learn && !isStr(t.learn.keyIdea)) errs.push(`${at}.learn.keyIdea missing`)
  if (t.learn && !t.learn.sections?.some((s) => s?.visual)) warns.push(`${at}.learn has no visual`)
  // examples
  if (!Array.isArray(t.examples) || !t.examples.length) errs.push(`${at}.examples missing/empty`)
  else t.examples.forEach((e, i) => {
    const p = `${at}.examples[${i}]`
    for (const k of ['title', 'prompt', 'check', 'answer']) if (!isStr(e?.[k]) && typeof e?.[k] !== 'number') errs.push(`${p}.${k} missing`)
    if (!e?.mistake) warns.push(`${p}.mistake missing`)
    checkVisual(e?.visual, p, errs, warns, [e?.prompt, ...(e?.steps ?? []).map((x) => x?.do)].join(' '))
    if (!Array.isArray(e?.steps) || !e.steps.length) errs.push(`${p}.steps missing/empty`)
    else e.steps.forEach((s, j) => {
      if (typeof s === 'string') { errs.push(`${p}.steps[${j}] is a string; v2 needs {do, why}`); return }
      if (!isStr(s?.do)) errs.push(`${p}.steps[${j}].do missing`)
      if (!isStr(s?.why)) errs.push(`${p}.steps[${j}].why missing`)
      checkVisual(s?.visual, `${p}.steps[${j}]`, errs, warns, `${s?.do} ${e?.prompt}`)
    })
  })
  // guided
  if (!Array.isArray(t.guided) || !t.guided.length) errs.push(`${at}.guided missing/empty`)
  else t.guided.forEach((g, i) => {
    const p = `${at}.guided[${i}]`
    if (!isStr(g?.prompt)) errs.push(`${p}.prompt missing`)
    if (g?.answer === undefined || g?.answer === '') errs.push(`${p}.answer missing`)
    checkVisual(g?.visual, p, errs, warns, [g?.prompt, ...(g?.steps ?? []).map((x) => `${x?.do} ${x?.worked}`)].join(' '))
    if (!Array.isArray(g?.steps) || !g.steps.length) errs.push(`${p}.steps missing/empty`)
    else {
      g.steps.forEach((s, j) => {
        const q = `${p}.steps[${j}]`
        if (!isStr(s?.do)) errs.push(`${q}.do missing`)
        if (!isStr(s?.why)) warns.push(`${q}.why missing`)
        if (!isStr(s?.hint)) errs.push(`${q}.hint missing`)
        if (!isStr(s?.worked)) errs.push(`${q}.worked missing`)
        checkInput(s?.input, q, errs, warns)
      })
      const last = g.steps[g.steps.length - 1]?.input
      if (last && g.answer !== undefined && last.type !== 'choice') {
        const a = parseFraction(g.answer), b = parseFraction(last.answer)
        if (a && b && Math.abs(a.value - b.value) > 1e-9) warns.push(`${p}.answer ${JSON.stringify(g.answer)} ≠ last step answer ${JSON.stringify(last.answer)} (final-answer-only mode will ask the step whose answer matches)`)
        if (!a) warns.push(`${p}.answer ${JSON.stringify(g.answer)} isn't numeric; final-answer-only mode will use the last step's input`)
      }
    }
  })
  return { errors: errs, warnings: warns }
}
