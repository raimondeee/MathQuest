// Shared (plain JS) helpers for geometry figures: the numbers a figure will LABEL,
// and number extraction from prompt text. Used by the app and scripts/check-content.js.
const GLYPH = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }

/** All numbers mentioned in a text (handles −, mixed glyph fractions like 2½, decimals). */
export function textNumbers(text) {
  const s = String(text).replace(/\u2212/g, '-')
  const out = []
  const re = /(-?\d+(?:\.\d+)?)?([½¼¾⅓⅔⅛])|(-?\d+(?:\.\d+)?)/g
  let m
  while ((m = re.exec(s))) {
    if (m[2]) out.push((m[1] ? Number(m[1]) : 0) + GLYPH[m[2]] * (m[1]?.startsWith('-') ? -1 : 1))
    else out.push(Number(m[3]))
  }
  return out
}

/** Numbers shown as labels in the rendered figure (unknowns excluded). */
export function figureNumbers(f) {
  if (!f || typeof f !== 'object') return []
  const unk = new Set(f.unknown ? [].concat(f.unknown) : [])
  const v = (...keys) => keys.filter((k) => !unk.has(k) && typeof f[k] === 'number').map((k) => f[k])
  switch (f.kind) {
    case 'triangle': return v('base', 'height')
    case 'house': return v('w', 'h', 'roofBase', 'roofHeight')
    case 'rect': return v('l', 'w')
    case 'parallelogram': return v('base', 'height', 'side')
    case 'trapezoid': return v('top', 'bottom', 'height')
    case 'lshape': return v('W', 'H', 'cutW', 'cutH')
    case 'hexagon': return v('side', 'apothem')
    case 'prism': return v('l', 'w', 'h')
    case 'prismBase': return v('area', 'h')
    case 'triPrism': return v('a', 'b', 'c', 'length')
    case 'cubeNet': return v('s')
    case 'pyramidNet': return v('base', 'slant')
    case 'coord': return (f.points || []).flat()
    default: return []
  }
}

/** Returns an error string if a figure labels a number that isn't in the prompt. */
export function checkFigure(f, prompt) {
  const known = ['triangle', 'house', 'rect', 'parallelogram', 'trapezoid', 'lshape', 'hexagon', 'prism', 'prismBase', 'triPrism', 'cubeNet', 'pyramidNet', 'coord']
  if (!known.includes(f.kind)) return `unknown figure kind ${f.kind}`
  const nums = textNumbers(prompt)
  for (const n of figureNumbers(f)) if (!nums.some((x) => Math.abs(x - n) < 1e-9)) return `label ${n} not in prompt`
  if (f.kind === 'coord' && !(f.points?.length >= 2)) return 'coord needs 2+ points'
  return null
}
