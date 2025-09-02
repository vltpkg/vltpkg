import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.?(c|m)[jt]s?(x)'],
    exclude: [
      '**/node_modules/**',
      '**/__fixtures__/**',
      '**/__mocks__/**',
    ],
    setupFiles: ['./scripts/browser-globals.js'],
  },
})
