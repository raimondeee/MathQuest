import { cpSync, readdirSync, mkdirSync } from 'node:fs'
const src = new URL('../../content/', import.meta.url)
const dst = new URL('../src/content/', import.meta.url)
mkdirSync(dst, { recursive: true })
for (const f of readdirSync(src).filter((f) => f.endsWith('.json') && !f.endsWith('.v2.json'))) {
  cpSync(new URL(f, src), new URL(f, dst))
  console.log('copied', f)
}
// Re-apply the v2 Number System merge if Carl's file exists.
import { execFileSync } from 'node:child_process'
try { execFileSync(process.execPath, [new URL('./wire-v2.js', import.meta.url).pathname], { stdio: 'inherit' }) } catch { process.exitCode = 1 }
