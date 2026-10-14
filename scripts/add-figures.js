// Adds structured `figure` data to geometry questions/examples, parsed from the prompt text.
// Idempotent. Writes ../content/geometry.json (source of truth) and src/content/geometry.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { textNumbers, checkFigure } from '../src/figdata.js'

const SRC = new URL('../../content/geometry.json', import.meta.url)
const D = JSON.parse(readFileSync(SRC, 'utf8'))
const UNIT = { 'square centimeters': 'cm', 'square meters': 'm', 'square inches': 'in', 'square feet': 'ft', 'cubic centimeters': 'cm', 'cubic feet': 'ft' }
const unitOf = (p) => (p.match(/\d\s*(cm|m|in|ft)\b/) || [])[1] || Object.entries(UNIT).find(([k]) => p.includes(k))?.[1] || ''
const fracFmt = (p) => (/[½¼¾]/.test(p) ? { fmt: 'frac' } : {})

function figureFor(p) {
  const n = textNumbers(p), u = unitOf(p), F = fracFmt(p)
  let m
  if (/how many faces/i.test(p)) return null
  if (/square pyramid/i.test(p)) return { kind: 'pyramidNet', base: n[0], slant: n[1], unit: u }
  if (/house shape/i.test(p)) return { kind: 'house', w: n[0], h: n[1], roofBase: n[2], roofHeight: n[3], unit: 'ft' }
  if (/hexagon/i.test(p)) return { kind: 'hexagon', side: n[1], apothem: n[2], unit: u }
  if (/L-shape/i.test(p)) return { kind: 'lshape', W: n[0], H: n[1], cutW: n[2], cutH: n[3], unit: u }
  if (/trapezoid/i.test(p)) return { kind: 'trapezoid', top: n[0], bottom: n[1], height: n[2], unit: u }
  if (/parallelogram/i.test(p)) {
    if (/slanted side/.test(p)) return { kind: 'parallelogram', base: n[0], side: n[1], height: n[2], unit: u }
    return { kind: 'parallelogram', base: n[0], height: n[1], unit: u }
  }
  if (/right triangle has vertices|vertices|\(\s*-?\d|Distance from|apart are/i.test(p) && (m = [...p.replace(/\u2212/g, '-').matchAll(/\((-?\d+),\s*(-?\d+)\)/g)]).length >= 2) {
    return { kind: 'coord', points: m.map((x) => [Number(x[1]), Number(x[2])]), closed: m.length > 2, unit: u }
  }
  if (/triangle has an area|triangle has area/i.test(p)) {
    const area = n[0], base = n[1]
    return { kind: 'triangle', base, height: (2 * area) / base, unknown: 'height', unit: u }
  }
  if (/right triangle/i.test(p)) return { kind: 'triangle', base: n[0], height: n[1], right: true, unit: u }
  if (/triangular prism/i.test(p)) return { kind: 'triPrism', a: n[0], b: n[1], c: n[2], length: n[n.length - 1], unit: u }
  if (/slanted triangle/i.test(p)) return { kind: 'triangle', base: n[0], height: n[1], obtuse: true, unit: u }
  if (/triangle/i.test(p)) return { kind: 'triangle', base: n[0], height: n[1], unit: u }
  if (/rectangle is \d/i.test(p)) return { kind: 'rect', l: n[0], w: n[1], unit: u }
  if (/cube (has edges|with edge)/i.test(p)) return { kind: 'cubeNet', s: n[0], unit: u }
  if (/base (of a prism has an )?area/i.test(p)) return { kind: 'prismBase', area: n[0], h: n[1], unit: u || 'in', ...F }
  if (/fish tank/i.test(p)) return { kind: 'prism', l: n[1], w: n[2], h: n[0] / (n[1] * n[2]), unknown: 'h', unit: u }
  if (/1-cm unit cubes/i.test(p)) return { kind: 'prism', l: n[1], w: n[2], h: n[3], cubes: 1, unit: 'cm' }
  if (/unit cubes/i.test(p)) return { kind: 'prism', l: n[0], w: n[1], h: n[2], cubes: 1 }
  if (/½-in(ch)? cubes|edges of ½ inch/.test(p)) { const d = n.filter((x) => x !== 0.5 || false).slice(-3); return { kind: 'prism', l: d[0], w: d[1], h: d[2], cubes: 0.5, unit: 'in', ...F } }
  if (/cubes\.?$/.test(p) && /Box (\d+) by/.test(p)) return { kind: 'prism', l: n[0], w: n[1], h: n[2], cubes: 1, unit: '' }
  if (/prism|box/i.test(p) && n.length >= 3) { const d = n.slice(-3); return { kind: 'prism', l: d[0], w: d[1], h: d[2], unit: u, ...F } }
  return null
}

let nq = 0, ne = 0, errs = 0
const apply = (obj, label) => {
  delete obj.figure
  const f = figureFor(obj.prompt)
  if (!f) return false
  for (const k of Object.keys(f)) if (f[k] === undefined || Number.isNaN(f[k])) { console.error('BAD', label, k, obj.prompt); errs++; return false }
  if (!f.unit) delete f.unit
  const e = checkFigure(f, obj.prompt)
  if (e) { console.error('MISMATCH', label, e, obj.prompt); errs++; return false }
  obj.figure = f
  return true
}
for (const q of D.questions) if (apply(q, q.id)) nq++
for (const t of D.topics) t.examples.forEach((ex, i) => { if (apply(ex, `${t.id}#${i}`)) ne++ })
if (errs) { console.error(`${errs} error(s); not writing`); process.exit(1) }
const json = JSON.stringify(D, null, 2) + '\n'
writeFileSync(SRC, json)
writeFileSync(new URL('../src/content/geometry.json', import.meta.url), json)
console.log(`figures: ${nq}/${D.questions.length} questions, ${ne}/${D.topics.reduce((a, t) => a + t.examples.length, 0)} examples`)
