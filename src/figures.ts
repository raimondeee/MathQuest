// Parametric, roughly-to-scale SVG diagrams for geometry questions/examples.
// Every labeled number comes from the structured `figure` data (see src/figdata.js).
import type { Figure } from './types'

type Pt = [number, number]
const FONT = 15
const fmtNum = (x: number, frac?: boolean) => {
  const r = Math.round(x * 100) / 100
  if (frac) {
    const w = Math.trunc(r), f = Math.round((Math.abs(r - w)) * 100) / 100
    const g: Record<number, string> = { 0.5: '½', 0.25: '¼', 0.75: '¾' }
    if (g[f]) return `${w === 0 ? '' : w}${g[f]}`
  }
  return String(r)
}

class Svg {
  parts: string[] = []
  minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity
  grow(x: number, y: number, pad = 0) { this.minX = Math.min(this.minX, x - pad); this.maxX = Math.max(this.maxX, x + pad); this.minY = Math.min(this.minY, y - pad); this.maxY = Math.max(this.maxY, y + pad) }
  poly(pts: Pt[], cls: string, closed = true) {
    pts.forEach(([x, y]) => this.grow(x, y, 2))
    this.parts.push(`<${closed ? 'polygon' : 'polyline'} class="${cls}" points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`)
  }
  line(a: Pt, b: Pt, cls = 'edge') { this.poly([a, b], cls, false) }
  circle(c: Pt, r: number, cls: string) { this.grow(c[0], c[1], r); this.parts.push(`<circle class="${cls}" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r}"/>`) }
  text(p: Pt, s: string, anchor: 'start' | 'middle' | 'end' = 'middle', cls = 'lbl') {
    const w = s.length * FONT * 0.56
    const x0 = anchor === 'start' ? p[0] : anchor === 'end' ? p[0] - w : p[0] - w / 2
    this.grow(x0 - 3, p[1] - FONT * 0.7); this.grow(x0 + w + 3, p[1] + FONT * 0.5)
    this.parts.push(`<text class="${cls}" x="${p[0].toFixed(1)}" y="${(p[1] + FONT * 0.35).toFixed(1)}" text-anchor="${anchor}">${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`)
  }
  /** Label a segment at its midpoint, pushed outward by `off` px along the normal (toward `away` side sign). */
  dim(a: Pt, b: Pt, s: string, off = 14) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1
    const nx = dy / L, ny = -dx / L // left normal (screen coords)
    const ox = nx * off, oy = ny * off
    const anchor = Math.abs(nx) > 0.6 ? (nx > 0 ? 'start' : 'end') : 'middle'
    this.text([mx + ox, my + oy], s, anchor)
  }
  rightAngle(c: Pt, u: Pt, v: Pt, size = 10) {
    const p1: Pt = [c[0] + u[0] * size, c[1] + u[1] * size], p3: Pt = [c[0] + v[0] * size, c[1] + v[1] * size]
    this.poly([p1, [p1[0] + v[0] * size, p1[1] + v[1] * size], p3], 'mark', false)
  }
  toString(label: string) {
    const pad = 6
    const w = this.maxX - this.minX + pad * 2, h = this.maxY - this.minY + pad * 2
    return `<svg class="figure" role="img" aria-label="${label.replace(/"/g, '&quot;')}" viewBox="${(this.minX - pad).toFixed(1)} ${(this.minY - pad).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" style="max-width:${Math.round(Math.min(560, w * 1.25))}px" xmlns="http://www.w3.org/2000/svg">${this.parts.join('')}</svg>`
  }
}

/** Uniform scale so a model of size (w × h) fits in roughly maxW × maxH px; keeps tiny sides visible. */
const fit = (w: number, h: number, maxW = 300, maxH = 190) => Math.min(maxW / Math.max(w, 1e-6), maxH / Math.max(h, 1e-6))

export function renderFigure(f: Figure | undefined): string {
  if (!f || typeof f !== 'object') return ''
  try {
    const out = draw(f)
    return out ? `<div class="figure-wrap">${out}</div>` : ''
  } catch (e) {
    console.warn('figure render failed', f, e)
    return ''
  }
}

function draw(f: Figure): string | null {
  const u = f.unit ? ` ${f.unit}` : ''
  const fr = f.fmt === 'frac'
  const L = (x: number) => `${fmtNum(x, fr)}${u}`
  const unk = new Set(f.unknown ? ([] as string[]).concat(f.unknown) : [])
  const S = new Svg()
  switch (f.kind) {
    case 'triangle': {
      const b = f.base!, h = f.height!
      const ax = f.right ? 0 : f.obtuse ? b * 1.3 : b * 0.38
      const k = fit(Math.max(b, ax), h)
      const A: Pt = [0, 0], B: Pt = [b * k, 0], C: Pt = [ax * k, -h * k], F: Pt = [ax * k, 0]
      S.poly([A, B, C], 'shape')
      S.dim(B, A, L(b))
      const hl = unk.has('height') ? 'h = ?' : L(h)
      if (f.right) { S.rightAngle(A, [1, 0], [0, -1]); S.dim(A, C, hl) }
      else {
        if (f.obtuse) S.line(B, F, 'ext')
        S.line(C, F, 'dash'); S.rightAngle(F, [f.obtuse ? -1 : 1, 0], [0, -1])
        S.dim(C, F, hl, 8)
      }
      return S.toString(`Triangle with base ${L(b)} and height ${unk.has('height') ? 'unknown' : L(h)}`)
    }
    case 'rect': {
      const k = fit(f.l!, f.w!)
      const W = f.l! * k, H = f.w! * k
      S.poly([[0, 0], [W, 0], [W, -H], [0, -H]], 'shape'); S.rightAngle([0, 0], [1, 0], [0, -1])
      S.dim([W, 0], [0, 0], L(f.l!)); S.dim([0, 0], [0, -H], L(f.w!))
      return S.toString(`Rectangle ${L(f.l!)} by ${L(f.w!)}`)
    }
    case 'parallelogram': {
      const b = f.base!, h = f.height!
      const off = f.side ? Math.sqrt(Math.max(0, f.side * f.side - h * h)) : b * 0.3
      const k = fit(b + off, h)
      const P: Pt[] = [[0, 0], [b * k, 0], [(b + off) * k, -h * k], [off * k, -h * k]]
      S.poly(P, 'shape'); S.line(P[3], [off * k, 0], 'dash'); S.rightAngle([off * k, 0], [1, 0], [0, -1])
      S.dim(P[1], P[0], L(b)); S.dim(P[3], [off * k, 0], `h = ${L(h)}`, 8)
      if (f.side) S.dim(P[0], P[3], L(f.side))
      return S.toString(`Parallelogram with base ${L(b)}, height ${L(h)}${f.side ? `, slanted side ${L(f.side)}` : ''}`)
    }
    case 'trapezoid': {
      const a = f.top!, b = f.bottom!, h = f.height!
      const k = fit(b, h)
      const x0 = ((b - a) / 2) * k
      const P: Pt[] = [[0, 0], [b * k, 0], [x0 + a * k, -h * k], [x0, -h * k]]
      S.poly(P, 'shape'); S.line(P[3], [x0, 0], 'dash'); S.rightAngle([x0, 0], [1, 0], [0, -1])
      S.dim(P[1], P[0], L(b)); S.dim(P[3], P[2], L(a)); S.dim(P[3], [x0, 0], `h = ${L(h)}`, 8)
      return S.toString(`Trapezoid with parallel sides ${L(a)} and ${L(b)}, height ${L(h)}`)
    }
    case 'house': {
      const w = f.w!, h = f.h!, rb = f.roofBase!, rh = f.roofHeight!
      const k = fit(w, h + rh)
      const W = w * k, H = h * k, x0 = ((w - rb) / 2) * k, apex: Pt = [W / 2, -(h + rh) * k]
      S.poly([[0, 0], [W, 0], [W, -H], [0, -H]], 'shape')
      S.poly([[x0, -H], [x0 + rb * k, -H], apex], 'shape2')
      S.line(apex, [W / 2, -H], 'dash')
      S.dim([W, 0], [0, 0], L(w)); S.dim([0, 0], [0, -H], L(h))
      S.text([W / 2, -H + 12], L(rb)); S.dim([W / 2, -H], apex, L(rh), 8)
      return S.toString(`House shape: rectangle ${L(w)} wide and ${L(h)} tall with a triangle roof, base ${L(rb)} and height ${L(rh)}`)
    }
    case 'lshape': {
      const k = fit(f.W!, f.H!)
      const W = f.W! * k, H = f.H! * k, cw = f.cutW! * k, ch = f.cutH! * k
      S.poly([[W - cw, -H], [W, -H], [W, -H + ch], [W - cw, -H + ch]], 'ghost')
      S.poly([[0, 0], [W, 0], [W, -H + ch], [W - cw, -H + ch], [W - cw, -H], [0, -H]], 'shape')
      S.dim([W, 0], [0, 0], L(f.W!)); S.dim([0, 0], [0, -H], L(f.H!))
      S.dim([W - cw, -H], [W, -H], L(f.cutW!), 12); S.dim([W, -H], [W, -H + ch], L(f.cutH!), 10)
      return S.toString(`L-shape: ${L(f.W!)} by ${L(f.H!)} rectangle with a ${L(f.cutW!)} by ${L(f.cutH!)} corner removed`)
    }
    case 'hexagon': {
      const s = f.side!, a = f.apothem!
      const k = fit(2 * s, 2 * a, 220, 190)
      const R = s * k // true regular hexagon; labeled apothem is the prompt value
      const P: Pt[] = Array.from({ length: 6 }, (_, i) => [R * Math.cos((Math.PI / 3) * i), -R * Math.sin((Math.PI / 3) * i)] as Pt)
      S.poly(P, 'shape')
      P.forEach((p) => S.line([0, 0], p, 'thin'))
      S.poly([[0, 0], P[4], P[5]], 'shape2') // bottom triangle highlighted
      const am = R * Math.sin(Math.PI / 3)
      S.line([0, 0], [0, am], 'dash'); S.rightAngle([0, am], [1, 0], [0, -1], 8)
      S.dim(P[5], P[4], L(s)); S.dim([0, 0], [0, am], L(a), 8)
      return S.toString(`Regular hexagon split into 6 triangles, each with base ${L(s)} and height ${L(a)}`)
    }
    case 'prism':
    case 'prismBase': {
      let l: number, w: number, h: number
      if (f.kind === 'prismBase') { l = w = Math.sqrt(f.area!); h = f.h! } else { l = f.l!; w = f.w!; h = f.h! }
      const dx = 0.55 * Math.cos(Math.PI / 6), dy = 0.55 * Math.sin(Math.PI / 6)
      const k = fit(l + w * dx, h + w * dy, 290, 190)
      const p = (x: number, y: number, z: number): Pt => [(x + z * dx) * k, -(y + z * dy) * k]
      const f0 = [p(0, 0, 0), p(l, 0, 0), p(l, h, 0), p(0, h, 0)], b0 = [p(0, 0, w), p(l, 0, w), p(l, h, w), p(0, h, w)]
      if (f.kind === 'prismBase') S.poly([f0[0], f0[1], b0[1], b0[0]], 'base')
      S.poly([f0[3], f0[2], b0[2], b0[3]], 'top'); S.poly([f0[1], b0[1], b0[2], f0[2]], 'side'); S.poly(f0, 'front')
      S.line(f0[0], b0[0], 'hidden'); S.line(b0[0], b0[1], 'hidden'); S.line(b0[0], b0[3], 'hidden')
      if (f.kind === 'prismBase') S.line(f0[0], f0[1], 'edge')
      if (f.cubes) { // unit-cube grid on the three visible faces
        const c = f.cubes
        for (let x = c; x < l - 1e-9; x += c) { S.line(p(x, 0, 0), p(x, h, 0), 'grid'); S.line(p(x, h, 0), p(x, h, w), 'grid') }
        for (let y = c; y < h - 1e-9; y += c) { S.line(p(0, y, 0), p(l, y, 0), 'grid'); S.line(p(l, y, 0), p(l, y, w), 'grid') }
        for (let z = c; z < w - 1e-9; z += c) { S.line(p(0, h, z), p(l, h, z), 'grid'); S.line(p(l, 0, z), p(l, h, z), 'grid') }
      }
      if (f.kind === 'prismBase') {
        S.text([(f0[0][0] + b0[1][0]) / 2, (f0[0][1] + b0[1][1]) / 2 + 2], `B = ${fmtNum(f.area!, fr)}${u}²`)
        S.dim(b0[2], b0[1], `h = ${L(h)}`, 10)
      } else {
        S.dim(f0[1], f0[0], L(l), l * k < 70 ? 30 : 14); S.dim(b0[1], f0[1], L(w), 16)
        S.dim(b0[2], b0[1], unk.has('h') ? 'h = ?' : L(h), 10)
      }
      return S.toString(f.kind === 'prismBase' ? `Prism with base area ${fmtNum(f.area!, fr)} square${u} and height ${L(h)}` : `Rectangular prism ${L(l)} long, ${L(w)} wide, ${unk.has('h') ? 'unknown height' : L(h) + ' tall'}${f.cubes ? `, filled with ${fmtNum(f.cubes, true)}${u}-cubes` : ''}`)
    }
    case 'triPrism': {
      const a = f.a!, b = f.b!, c = f.c!, len = f.length!
      const dx = 0.6 * Math.cos(Math.PI / 6), dy = 0.6 * Math.sin(Math.PI / 6)
      const k = fit(b + len * dx, a + len * dy, 290, 190)
      const D: Pt = [len * dx * k, -len * dy * k]
      const A: Pt = [0, 0], B: Pt = [b * k, 0], C: Pt = [0, -a * k]
      const m = (p: Pt): Pt => [p[0] + D[0], p[1] + D[1]]
      // visible: front triangle + slanted (hypotenuse) face; bottom/back edges dashed
      S.poly([C, B, m(B), m(C)], 'top')
      S.poly([A, B, C], 'front')
      S.line(m(A), m(C), 'hidden'); S.line(A, m(A), 'hidden'); S.line(m(A), m(B), 'hidden'); S.rightAngle(A, [1, 0], [0, -1], 8)
      S.dim(B, A, L(b)); S.dim(A, C, L(a)); S.dim(B, C, L(c), 12)
      S.dim(m(B), B, L(len), 12)
      return S.toString(`Triangular prism with right-triangle ends (legs ${L(a)} and ${L(b)}, long side ${L(c)}) and length ${L(len)}`)
    }
    case 'cubeNet': {
      const k = Math.min(48, 300 / 4 / Math.max(1, 1)), s = k
      const cells: Pt[] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]]
      cells.forEach(([cx, cy]) => S.poly([[cx * s, cy * s], [(cx + 1) * s, cy * s], [(cx + 1) * s, (cy + 1) * s], [cx * s, (cy + 1) * s]], 'shape'))
      S.dim([0, 2 * s], [s, 2 * s], L(f.s!), -14); S.dim([0, 2 * s], [0, s], L(f.s!), 14)
      return S.toString(`Net of a cube: 6 squares, each ${L(f.s!)} on a side`)
    }
    case 'pyramidNet': {
      const b = f.base!, sl = f.slant!
      const k = fit(b + 2 * sl, b + 2 * sl, 260, 260)
      const B = b * k, H = sl * k
      S.poly([[0, 0], [B, 0], [B, B], [0, B]], 'shape2')
      S.poly([[0, 0], [B, 0], [B / 2, -H]], 'shape'); S.poly([[B, 0], [B, B], [B + H, B / 2]], 'shape')
      S.poly([[0, B], [B, B], [B / 2, B + H]], 'shape'); S.poly([[0, 0], [0, B], [-H, B / 2]], 'shape')
      S.line([B / 2, 0], [B / 2, -H], 'dash')
      S.dim([B / 2, 0], [B / 2, -H], L(sl), 6); S.dim([0, B], [B, B], L(b), 12)
      return S.toString(`Net of a square pyramid: square base ${L(b)} on a side and 4 triangles with slant height ${L(sl)}`)
    }
    case 'coord': {
      const pts = (f.points ?? []) as Pt[]
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
      const x0 = Math.min(0, ...xs) - 1, x1 = Math.max(0, ...xs) + 1, y0 = Math.min(0, ...ys) - 1, y1 = Math.max(0, ...ys) + 1
      const c = Math.min(30, 340 / (x1 - x0), 300 / (y1 - y0))
      const X = (x: number) => (x - x0) * c, Y = (y: number) => (y1 - y) * c
      for (let x = x0; x <= x1; x++) S.line([X(x), Y(y0)], [X(x), Y(y1)], x === 0 ? 'axis' : 'gridline')
      for (let y = y0; y <= y1; y++) S.line([X(x0), Y(y)], [X(x1), Y(y)], y === 0 ? 'axis' : 'gridline')
      const step = x1 - x0 > 12 || y1 - y0 > 12 ? 2 : 1
      for (let x = x0 + 1; x < x1; x++) if (x !== 0 && x % step === 0) S.text([X(x), Y(0) + 11], String(x).replace('-', '−'), 'middle', 'tick')
      for (let y = y0 + 1; y < y1; y++) if (y !== 0 && y % step === 0) S.text([X(0) - 5, Y(y)], String(y).replace('-', '−'), 'end', 'tick')
      S.text([X(0) - 5, Y(0) + 11], '0', 'end', 'tick')
      const P = pts.map((p) => [X(p[0]), Y(p[1])] as Pt)
      S.poly(P, f.closed ? 'shape' : 'seg', !!f.closed)
      const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length
      pts.forEach((p, i) => {
        S.circle(P[i], 4.5, 'pt')
        const left = P[i][0] < cx || (P.length === 2 && i === 0 && P[0][0] !== P[1][0])
        const up = P[i][1] <= cy
        const lbl = `(${p[0]}, ${p[1]})`.replace(/-/g, '−')
        S.text([P[i][0] + (left ? -8 : 8), P[i][1] + (P.length === 2 && P[0][0] === P[1][0] ? 0 : up ? -12 : 14)], lbl, left ? 'end' : 'start', 'vlbl')
      })
      return S.toString(`Coordinate grid with ${f.closed ? 'a polygon with vertices' : 'points'} ${pts.map((p) => `(${p[0]}, ${p[1]})`).join(', ')}`)
    }
  }
  return null
}
