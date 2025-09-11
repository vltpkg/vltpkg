import { defineNitroConfig } from 'nitro/config'

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
      connector: 'sqlite',
      options: { name: 'db' },
    },
  },
})
