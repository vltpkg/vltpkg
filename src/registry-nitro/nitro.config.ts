import 'dotenv/config'
import { defineNitroConfig } from 'nitro/config'
import { resolve } from 'node:path'

const buildPreset = (process.env.VSR_BUILD_PRESET ??
  'node-server') as 'node-server' | 'cloudflare-module' | 'vercel'

const tarballStorage = (process.env.VSR_TARBALL_STORAGE ?? 'fs') as
  | 'fs'
  | 'r2'
  | 's3'

const database = (process.env.VSR_DATABASE ?? 'sqlite') as
  | 'neon'
  | 'sqlite'

export default defineNitroConfig({
  preset: buildPreset,
  compatibilityDate: '2025-09-22',
  serverDir: './src',
  minify: false,
  imports: false,
  runtimeConfig: {
    db: database,
    tarballStorage,
    buildPreset,
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
    default:
      tarballStorage === 'r2' ?
        {
          driver: 'cloudflare-r2',
          bucket: 'vsr-production-tarballs',
        }
      : tarballStorage === 's3' ?
        {
          driver: 's3',
          bucket: 'vsr-prod-1',
          endpoint: 'https://s3.us-east-1.amazonaws.com/',
          region: 'us-east-1',
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : {
          driver: 'fs-lite',
          base: resolve(import.meta.dirname, '.data'),
        },
  },
})
