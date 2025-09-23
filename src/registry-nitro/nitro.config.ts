import { defineNitroConfig } from 'nitro/config'
import { resolve } from 'node:path'

const preset =
  process.env.VSR_CLOUDFLARE ? 'cloudflare-module' : 'node-server'

const packagesDriver = resolve(
  import.meta.dirname,
  `./src/drivers/packages-${preset === 'cloudflare-module' ? 'cloudflare' : 'node'}.ts`,
)

const tarballsDriver = resolve(
  import.meta.dirname,
  `./src/drivers/tarballs-${preset === 'cloudflare-module' ? 'cloudflare' : 'node'}.ts`,
)

export default defineNitroConfig({
  preset,
  compatibilityDate: '2025-09-22',
  srcDir: 'server',
  minify: false,
  imports: false,
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
    wrangler: {
      dev: {
        port: 3000,
      },
      observability: {
        logs: {
          enabled: true,
        },
      },
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'vsr-database',
          database_id: 'bde782f8-f31b-4771-a79a-642935b3fc6c',
          migrations_dir: '../../drizzle',
        },
      ],
      r2_buckets: [
        {
          binding: 'BUCKET',
          bucket_name: 'vsr-bucket',
        },
      ],
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
