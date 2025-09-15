import { defineNitroConfig } from 'nitro/config'
import { resolve } from 'node:path'

// https://nitro.build/config
export default defineNitroConfig({
  compatibilityDate: 'latest',
  srcDir: 'server',
  imports: false,
  experimental: {
    database: true,
  },
  database: {
    default: {
      connector: 'libsql',
      options: { url: 'file:db.sqlite' },
    },
  },
  storage: {
    cache: {
      driver: resolve(import.meta.dirname, './src/custom-driver.ts'),
    },
  },
  devStorage: {
    cache: {
      driver: resolve(import.meta.dirname, './src/custom-driver.ts'),
    },
  },
})
