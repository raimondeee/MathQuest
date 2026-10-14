import { defineConfig } from 'vite'

// GitHub Pages project site: VITE_BASE=/MathQuest/ npm run build
// Local / LAN: leave unset → './'
const base = process.env.VITE_BASE || './'

export default defineConfig({
  base,
  build: { outDir: 'dist', emptyOutDir: true },
})
