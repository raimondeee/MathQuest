// Parametric SVG visuals for v2 lessons (fractionBars, numberLine, areaModel, placeValue, coordPlane).
// Unknown kinds render nothing. Shares drawing helpers/style with figures.ts.
import type { Visual } from './types'
import { Svg } from './figures'
import { renderFigure } from './figures'

type Pt = [number, number]
const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const GL: Record<string, string> = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/8': '⅛', '1/5': '⅕', '1/6': '⅙' }
/** Pretty label for a value: integers, common fractions, mixed numbers. */
function nice(v: number): string {
  if (Math.abs(v - Math.round(v)) < 1e-6) return String(Math.round(v)).replace('-', '−')
  for (const d of [2, 3, 4, 5, 6, 8, 10, 12]) {
    const k = v * d
    if (Math.abs(k - Math.round(k)) < 1e-6) {
      const num = Math.round(k), w = Math.trunc(num / d), r = Math.abs(num % d)
      const fr = GL[`${r}/${d}`] ?? `${r}/${d}`
      return `${v < 0 ? '−' : ''}${w ? Math.abs(w) : ''}${fr}`
    }
  }
  return String(Math.round(v * 100) / 100)
}

export function renderVisual(v: Visual | undefined): string {
  if (!v || typeof v !== 'object') return ''
  try {
    const svg = draw(v)
    return svg ? `<div class="figure-wrap visual">${svg}</div>` : ''
  } catch (e) { console.warn('visual failed', v, e); return '' }
}

function draw(v: Visual): string | null {
  const S = new Svg()
  switch (v.kind) {
    case 'fractionBars': {
      const wholes = Math.max(1, Math.min(12, Math.round(n(v.wholes, 1)))), parts = Math.max(1, Math.min(24, Math.round(n(v.parts, 1))))
      const shaded = Math.max(0, Math.min(wholes * parts, Math.round(n(v.shaded, 0))))
      const g = v.groupSize as { num?: number; den?: number } | undefined
      const perRow = wholes <= 4 ? wholes : Math.ceil(wholes / 2)
      const W = Math.min(150, 520 / perRow), H = 34, gap = 10
      const total = wholes * parts
      const cell = (i: number): Pt => { const w = Math.floor(i / parts), r = Math.floor(w / perRow); return [(w % perRow) * (W + gap) + ((i % parts) * W) / parts, r * (H + 46)] }
      for (let i = 0; i < total; i++) {
        const [x, y] = cell(i)
        S.poly([[x, y], [x + W / parts, y], [x + W / parts, y + H], [x, y + H]], i < shaded ? 'fb-on' : 'fb-off')
      }
      for (let w = 0; w < wholes; w++) { const [x, y] = cell(w * parts); S.poly([[x, y], [x + W, y], [x + W, y + H], [x, y + H]], 'edge'); S.text([x + W / 2, y - 10], '1 whole', 'middle', 'tick') }
      if (g && n(g.den) > 0) {
        const size = (n(g.num) / n(g.den)) * parts // parts per group
        const span = shaded || total
        if (size > 0 && Math.abs(size - Math.round(size)) < 1e-6) {
          const k = Math.round(size)
          let idx = 0, gi = 0
          while (idx < span && gi < 60) {
            const end = Math.min(idx + k, span), full = end - idx === k
            // group bracket may cross a whole boundary/row: draw per-segment
            for (let i = idx; i < end; i++) {
              const [x, y] = cell(i), yy = y + H + 6
              S.line([x + 1.5, yy], [x + W / parts - 1.5, yy], full ? 'brk' : 'brk-part')
            }
            const [mx, my] = cell(idx)
            S.text([mx + (Math.min(k, parts - (idx % parts)) * W) / parts / 2, my + H + 20], full ? String(gi + 1) : 'part', 'middle', 'grp')
            idx = end; gi++
          }
        }
      }
      return S.toString(`Fraction bars: ${wholes} whole${wholes > 1 ? 's' : ''} split into ${parts} parts${shaded ? `, ${shaded} shaded` : ''}${g ? `, grouped by ${n(g.num)}/${n(g.den)}` : ''}`)
    }
    case 'numberLine': {
      const min = n(v.min), max = n(v.max, 1), step = n(v.step, 1)
      if (!(max > min) || !(step > 0)) return null
      const L = 540, X = (x: number) => ((x - min) / (max - min)) * L
      S.line([-12, 0], [L + 12, 0], 'axis')
      S.poly([[L + 12, -5], [L + 20, 0], [L + 12, 5]], 'arrow'); S.poly([[-12, -5], [-20, 0], [-12, 5]], 'arrow')
      const ticks = Math.round((max - min) / step)
      const marks = (v.marks as { at: number; label?: string }[] | undefined) ?? []
      for (let i = 0; i <= Math.min(ticks, 80); i++) {
        const x = min + i * step
        S.line([X(x), -7], [X(x), 7], 'tickline')
        if (!marks.length && ticks <= 20) S.text([X(x), 22], nice(x), 'middle', 'tick')
      }
      for (const m of marks) { S.line([X(n(m.at)), -11], [X(n(m.at)), 11], 'axis'); S.text([X(n(m.at)), 24], String(m.label ?? nice(n(m.at))), 'middle') }
      for (const j of (v.jumps as { from: number; to: number; label?: string }[] | undefined) ?? []) {
        const a = X(n(j.from)), b = X(n(j.to)), hgt = Math.min(46, 12 + Math.abs(b - a) * 0.35)
        S.parts.push(`<path class="jump" d="M${a.toFixed(1)},-2 Q${((a + b) / 2).toFixed(1)},${(-hgt * 2).toFixed(1)} ${b.toFixed(1)},-2"/>`)
        S.poly([[b - 5, -9], [b, -2], [b + 1, -10]], 'jump', false)
        S.grow(a, -hgt - 4); S.grow(b, -hgt - 4)
        if (j.label) S.text([(a + b) / 2, -hgt - 10], String(j.label), 'middle', 'grp')
      }
      return S.toString(`Number line from ${nice(min)} to ${nice(max)}${marks.length ? `, marked ${marks.map((m) => m.label ?? nice(m.at)).join(', ')}` : ''}`)
    }
    case 'areaModel': {
      const rows = Math.max(1, Math.min(20, Math.round(n(v.rows, 1)))), cols = Math.max(1, Math.min(20, Math.round(n(v.cols, 1))))
      const sr = Math.round(n(v.shadeRows, 0)), sc = Math.round(n(v.shadeCols, 0))
      const c = Math.min(46, 320 / cols, 240 / rows)
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        const inR = r < sr, inC = k < sc
        S.poly([[k * c, r * c], [(k + 1) * c, r * c], [(k + 1) * c, (r + 1) * c], [k * c, (r + 1) * c]], inR && inC ? 'am-both' : inR ? 'am-row' : inC ? 'am-col' : 'am-off')
      }
      S.poly([[0, 0], [cols * c, 0], [cols * c, rows * c], [0, rows * c]], 'edge')
      const lab = { ...((v.labels ?? {}) as Record<string, string>) }
      if (lab.cols && !lab.top) lab.top = lab.cols // Carl's format: {rows:'12', cols:'2 + 3'}
      if (lab.rows && !lab.left) lab.left = lab.rows
      if (Array.isArray(v.labels)) { lab.top = (v.labels as string[])[0]; lab.left = (v.labels as string[])[1] }
      if (lab.top) S.text([(sc ? sc * c : cols * c) / 2, -14], String(lab.top))
      if (lab.left) S.text([-10, (sr ? sr * c : rows * c) / 2], String(lab.left), 'end')
      if (lab.right) S.text([cols * c + 10, (rows * c) / 2], String(lab.right), 'start')
      if (lab.bottom) S.text([(cols * c) / 2, rows * c + 16], String(lab.bottom))
      return S.toString(`Area model ${rows} by ${cols}${sr ? `, ${sr} rows shaded` : ''}${sc ? `, ${sc} columns shaded` : ''}${sr && sc ? `, overlap ${sr * sc} of ${rows * cols}` : ''}`)
    }
    case 'placeValue': {
      const raw = Array.isArray(v.digits) ? (v.digits as unknown[]).join('') : String(v.digits ?? '')
      const s = raw.replace(/[,\s]/g, '')
      if (!/^\d*\.?\d*$/.test(s) || !s.replace('.', '')) return null
      const [ip, fp = ''] = s.split('.')
      const INT = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions']
      const FR = ['tenths', 'hundredths', 'thousandths', 'ten-thousandths']
      const cols: { d: string; name: string }[] = [...ip.split('').map((d, i) => ({ d, name: INT[ip.length - 1 - i] ?? '' })), ...fp.split('').map((d, i) => ({ d, name: FR[i] ?? '' }))]
      const w = Math.min(78, 560 / Math.max(1, cols.length)), h = 56
      cols.forEach((col, i) => {
        const x = i * w + (i >= ip.length ? 14 : 0)
        S.poly([[x, 0], [x + w - 4, 0], [x + w - 4, h], [x, h]], i < ip.length ? 'pv-int' : 'pv-frac')
        S.text([x + (w - 4) / 2, h / 2 + 2], col.d, 'middle', 'pv-digit')
        S.text([x + (w - 4) / 2, h + 14], col.name, 'middle', 'tick')
      })
      if (fp) S.circle([ip.length * w + 4, h - 6], 4, 'pt')
      return S.toString(`Place value chart for ${raw}`)
    }
    case 'coordPlane': {
      const pts = ((v.points as { x: number; y: number; label?: string }[]) ?? []).filter((p) => typeof p?.x === 'number' && typeof p?.y === 'number')
      if (!pts.length) return null
      // Reuse the geometry coordinate-grid renderer (axes, ticks, labeled points), then add custom labels via aria.
      const html = renderFigure({ kind: 'coord', points: pts.map((p) => [p.x, p.y]), closed: false })
      return html.replace(/^<div class="figure-wrap">|<\/div>$/g, '').replace(/class="seg"/, 'class="seg none-line"')
        .replace(/aria-label="[^"]*"/, `aria-label="Coordinate plane with ${pts.map((p) => `${p.label ? p.label + ' ' : ''}(${p.x}, ${p.y})`).join(', ')}"`)
    }
  }
  return null
}
