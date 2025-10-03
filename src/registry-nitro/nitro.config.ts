import { defineNitroConfig } from 'nitro/config'
import { resolve } from 'node:path'

const Envs = {
  cloudflare: 'cloudflare',
  vercel: 'vercel',
  node: 'node',
}

const buildEnv =
  process.env.VSR_CLOUDFLARE ? Envs.cloudflare
  : process.env.VSR_VERCEL ? Envs.vercel
  : Envs.node

const getDriver = (
  type: 'packages' | 'tarballs',
  env: (typeof Envs)[keyof typeof Envs],
) => {
  return resolve(
    import.meta.dirname,
    `./src/drivers/${type}-${env}.ts`,
  )
}

export default defineNitroConfig({
  preset:
    buildEnv === Envs.cloudflare ? 'cloudflare-module'
    : buildEnv === Envs.vercel ? 'vercel'
    : 'node-server',
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
          database_name: 'vsr-production',
          database_id: 'bbefa4da-e572-4c89-b1f6-9f6ea992ffc3',
        },
      ],
      r2_buckets: [
        {
          binding: 'BUCKET',
          bucket_name: 'vsr-production-tarballs',
        },
      ],
    },
  },
  storage: {
    packages: {
      driver: getDriver('packages', buildEnv),
    },
    tarballs: {
      driver: getDriver('tarballs', buildEnv),
    },
  },
  devStorage: {
    packages: {
      driver: getDriver('packages', 'node'),
    },
    tarballs: {
      driver: getDriver('tarballs', 'node'),
    },
  },
})
