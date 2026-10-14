import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'

// GitHub Pages project site: VITE_BASE=/MathQuest/ npm run build
// Local / LAN: leave unset → './'
// Double-click local file: npm run build:local (mode "singlefile") → one self-contained HTML
const base = process.env.VITE_BASE || './'

/** Local single-file build: drop the manifest link and inline icon PNGs as data URIs. */
function localHtml(): Plugin {
  const icon = (n: number) => `data:image/png;base64,${readFileSync(new URL(`./public/icons/icon-${n}.png`, import.meta.url)).toString('base64')}`
  return {
    name: 'mathquest-local-html',
    transformIndexHtml: (html) =>
      html
        .replace(/\s*<link rel="manifest"[^>]*>/, '')
        .replace('./icons/icon-192.png', icon(192))
        .replace('./icons/icon-180.png', icon(180)),
  }
}

/** Stamp dist/sw.js with a build id (hash of all output files) and the precache list. */
function swVersion(): Plugin {
  let outDir = 'dist'
  return {
    name: 'mathquest-sw-version',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir },
    closeBundle() {
      const root = new URL(`./${outDir}/`, import.meta.url).pathname
      const files: string[] = []
      const walk = (d: string) => readdirSync(d).forEach((n) => { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : files.push(p) })
      walk(root)
      const rel = files.map((f) => relative(root, f).split('\\').join('/')).filter((f) => f !== 'sw.js' && !f.startsWith('.')).sort()
      const h = createHash('sha256')
      rel.forEach((f) => { h.update(f); h.update(readFileSync(join(root, f))) })
      const id = h.digest('hex').slice(0, 12)
      const precache = ['./', ...rel.map((f) => `./${f}`)]
      const sw = join(root, 'sw.js')
      writeFileSync(sw, readFileSync(sw, 'utf8').replace('__BUILD_ID__', id).replace('__PRECACHE__', JSON.stringify(precache)))
      console.log(`sw.js stamped: build ${id}, ${precache.length} precached URLs`)
    },
  }
}

export default defineConfig(({ mode }) =>
  mode === 'singlefile'
    ? {
        base: './',
        publicDir: false,
        plugins: [localHtml(), viteSingleFile()],
        build: { outDir: 'dist-local', emptyOutDir: true },
      }
    : { base, plugins: [swVersion()], build: { outDir: 'dist', emptyOutDir: true } },
)
