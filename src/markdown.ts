const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s: string) =>
  esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>').replace(/`([^`]+)`/g, '<code>$1</code>')

/** Minimal markdown: headings, bold/italic, ul/ol lists, paragraphs. */
export function renderMarkdown(md: string): string {
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  let para: string[] = []
  const flushP = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = [] } }
  const closeL = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (const line of md.split(/\r?\n/)) {
    const t = line.trim()
    let m
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
