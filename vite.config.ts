import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

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

export default defineConfig(({ mode }) =>
  mode === 'singlefile'
    ? {
        base: './',
        publicDir: false,
        plugins: [localHtml(), viteSingleFile()],
        build: { outDir: 'dist-local', emptyOutDir: true },
      }
    : { base, build: { outDir: 'dist', emptyOutDir: true } },
)
