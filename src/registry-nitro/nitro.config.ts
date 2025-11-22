import 'dotenv/config'
import { defineNitroConfig } from 'nitro/config'

const {
  VSR_PLATFORM = 'node',
  VSR_STORAGE = 'fs',
  VSR_DATABASE = 'sqlite',
  VSR_PACKUMENT_TTL = '5m',
  VSR_MANIFEST_TTL = '24h',
  VSR_TARBALL_TTL = '1yr',
} = process.env

const platform = VSR_PLATFORM as 'node' | 'cloudflare' | 'vercel'

const storage = VSR_STORAGE as 'fs' | 'r2' | 's3'

const database = VSR_DATABASE as 'neon' | 'sqlite'

export default defineNitroConfig({
  preset: platform === 'cloudflare' ? 'cloudflare-module' : platform,
  compatibilityDate: '2025-09-22',
  serverDir: './src',
  minify: false,
  imports: false,
  runtimeConfig: {
    database,
    storage,
    platform,
    packumentTtl: VSR_PACKUMENT_TTL,
    manifestTtl: VSR_MANIFEST_TTL,
    tarballTtl: VSR_TARBALL_TTL,
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
})
