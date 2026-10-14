import { cpSync, readdirSync, mkdirSync } from 'node:fs'
const src = new URL('../../content/', import.meta.url)
const dst = new URL('../src/content/', import.meta.url)
mkdirSync(dst, { recursive: true })
for (const f of readdirSync(src).filter((f) => f.endsWith('.json'))) {
  cpSync(new URL(f, src), new URL(f, dst))
  console.log('copied', f)
}
