// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'main.ts'),
      name: 'MeeExtensionLib',
      fileName: 'mee-extension-lib',
    },
  },
  plugins: [dts()]
})