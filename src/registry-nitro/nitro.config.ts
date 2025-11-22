import 'dotenv/config'
import { defineNitroConfig } from 'nitro/config'
import { resolve } from 'node:path'

const {
  VSR_BUILD_PRESET,
  VSR_TARBALL_STORAGE,
  VSR_DATABASE,
  VSR_NEON_DATABASE_URL,
  VSR_SQLITE_DATABASE_FILE_NAME,
  VSR_S3_BUCKET,
  VSR_S3_ENDPOINT,
  VSR_S3_REGION,
  VSR_S3_ACCESS_KEY_ID,
  VSR_S3_SECRET_ACCESS_KEY,
} = process.env

const buildPreset = (VSR_BUILD_PRESET ?? 'node-server') as
  | 'node-server'
  | 'cloudflare-module'
  | 'vercel'

const tarballStorage = (VSR_TARBALL_STORAGE ?? 'fs') as
  | 'fs'
  | 'r2'
  | 's3'

const database = (VSR_DATABASE ?? 'sqlite') as 'neon' | 'sqlite'

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
    NEON_DATABASE_URL: VSR_NEON_DATABASE_URL,
    SQLITE_DATABASE_FILE_NAME: VSR_SQLITE_DATABASE_FILE_NAME,
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
      tarballStorage === 'r2' ?
        {
          driver: 'cloudflare-r2',
          bucket: 'vsr-production-tarballs',
        }
      : tarballStorage === 's3' ?
        {
          driver: 's3',
          bucket: VSR_S3_BUCKET,
          endpoint: VSR_S3_ENDPOINT,
          region: VSR_S3_REGION,
          accessKeyId: VSR_S3_ACCESS_KEY_ID,
          secretAccessKey: VSR_S3_SECRET_ACCESS_KEY,
        }
      : {
          driver: 'fs-lite',
          base: resolve(import.meta.dirname, '.data'),
        },
  },
})
