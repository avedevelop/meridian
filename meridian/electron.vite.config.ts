import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      // These are ESM-only. The main bundle is CJS, and a plain require() of them hands unified a module
      // namespace instead of the plugin ("empty preset" crash at startup), so bundle them in.
      externalizeDeps: { exclude: ['unified', 'rehype-parse', 'rehype-sanitize', 'rehype-stringify'] }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()],
    build: {
      // electron-vite leaves the renderer unminified by default: ~4.8 MB of JS to parse at startup
      minify: 'esbuild'
    }
  }
})
