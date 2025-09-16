import { defineNitroConfig } from 'nitro/config'
import { resolve } from 'node:path'

const packagesDriver = resolve(
  import.meta.dirname,
  './src/packages-driver.ts',
)
const tarballsDriver = resolve(
  import.meta.dirname,
  './src/tarballs-driver.ts',
)

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
    packages: {
      driver: packagesDriver,
    },
    tarballs: {
      driver: tarballsDriver,
    },
  },
  devStorage: {
    packages: {
      driver: packagesDriver,
    },
    tarballs: {
      driver: tarballsDriver,
    },
  },
})
