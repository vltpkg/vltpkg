import { useStorage } from 'nitro/storage'
import { useRuntimeConfig } from 'nitro/runtime-config'
import s3 from 'unstorage/drivers/s3'
import fsLite from 'unstorage/drivers/fs-lite'
import { resolve } from 'node:path'
import r2 from 'unstorage/drivers/cloudflare-r2-binding'
import { definePlugin } from 'nitro'

export default definePlugin(() => {
  const storage = useStorage()
  const config = useRuntimeConfig()

  console.log('[storage]', config.storage)

  if (config.storage === 'fs') {
    return storage.mount(
      'tarballs',
      fsLite({
        base: resolve(process.cwd(), '.data'),
      }),
    )
  }

  if (config.storage === 's3') {
    return storage.mount(
      'tarballs',
      s3({
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      }),
    )
  }

  if (config.storage === 'r2') {
    return storage.mount(
      'tarballs',
      r2({
        bucket: config.R2_BUCKET,
      }),
    )
  }

  throw new Error(`Invalid storage type: ${config.storage}`)
})
