const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s: string) =>
  esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>').replace(/`([^`]+)`/g, '<code>$1</code>')

/** Minimal markdown: headings, bold/italic, ul/ol lists, paragraphs. */
export function renderMarkdown(md: string): string {
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  let para: string[] = []
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = [] } }
  const closeL = () => { if (list) { out.push(`</${list}>`); list = null } }
  const lines = md.split(/\r?\n/)
  for (let li = 0; li < lines.length; li++) {
    const t = lines[li].trim()
    let m
    // Markdown table: header row, |---| separator, body rows
    if (t.startsWith('|') && /^\|?\s*:?-{2,}/.test((lines[li + 1] ?? '').trim())) {
      flushP(); closeL()
      const cells = (r: string) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
      const head = cells(t); li += 2
      const body: string[][] = []
      while (li < lines.length && lines[li].trim().startsWith('|')) body.push(cells(lines[li++]))
      li--
      out.push(`<div class="md-table-wrap"><table class="md-table"><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
      continue
    }
    if (!t) { flushP(); closeL(); continue }
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { flushP(); closeL(); const l = Math.min(m[1].length + 2, 6); out.push(`<h${l}>${inline(m[2])}</h${l}>`); continue }
    if ((m = t.match(/^[-*•]\s+(.*)$/)) || (m = t.match(/^\d+[.)]\s+(.*)$/))) {
      const kind = /^\d/.test(t) ? 'ol' : 'ul'
      flushP(); if (list !== kind) { closeL(); out.push(`<${kind}>`); list = kind }
      out.push(`<li>${inline(m[1])}</li>`); continue
    }
    closeL(); para.push(t)
  }
  flushP(); closeL()
  return out.join('')
}
export { esc }
