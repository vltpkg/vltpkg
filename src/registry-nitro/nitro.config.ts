import 'dotenv/config'
import { defineNitroConfig } from 'nitro/config'
import { resolve } from 'node:path'

const Envs = {
  cloudflare: 'cloudflare',
  vercel: 'vercel',
  node: 'node',
}

// const DatabaseEnvs = {
//   neon: 'neon',
//   turso: 'turso',
//   sqlite: 'sqlite',
//   d1: 'd1',
// }

const buildEnv =
  process.env.VSR_CLOUDFLARE ? Envs.cloudflare
  : process.env.VSR_VERCEL ? Envs.vercel
  : Envs.node

// const databaseEnv =
//   buildEnv === Envs.cloudflare ? DatabaseEnvs.d1
//   : process.env.VSR_NEON ? DatabaseEnvs.neon
//   : process.env.VSR_TURSO ? DatabaseEnvs.turso
//   : DatabaseEnvs.sqlite

// const getDriver = (
//   type: 'packages' | 'tarballs',
//   env: (typeof Envs)[keyof typeof Envs],
// ) => {
//   return resolve(
//     import.meta.dirname,
//     `./src/drivers/${type}-${env}.ts`,
//   )
// }

const storage = 'fs' as 'fs' | 'r2' | 's3'

export default defineNitroConfig({
  preset:
    buildEnv === Envs.cloudflare ? 'cloudflare-module'
    : buildEnv === Envs.vercel ? 'vercel'
    : 'node-server',
  compatibilityDate: '2025-09-22',
  serverDir: './src',
  minify: false,
  imports: false,
  // builder: 'rolldown',
  runtimeConfig: {
    db: 'neon' as 'neon' | 'sqlite',
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
    SQLITE_DATABASE_FILE_NAME: process.env.SQLITE_DATABASE_FILE_NAME,
  },
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
    tarballs:
      storage === 'fs' ?
        {
          driver: 'fs-lite',
          base: resolve(import.meta.dirname, '.data/tarballs'),
        }
      : storage === 'r2' ?
        {
          driver: 'cloudflare-r2',
          bucket: 'vsr-production-tarballs',
        }
      : {
          driver: 's3',
          bucket: 'vsr-production-tarballs',
        },
  },
})
