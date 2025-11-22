import { useStorage } from 'nitro/storage'
import { useRuntimeConfig } from 'nitro/runtime-config'
import s3 from 'unstorage/drivers/s3'
import fsLite from 'unstorage/drivers/fs-lite'
import { resolve } from 'node:path'
import r2 from 'unstorage/drivers/cloudflare-r2-binding'
import { definePlugin } from 'nitro'
import type { Driver } from 'unstorage'

export default definePlugin(() => {
  const storage = useStorage()
  const config = useRuntimeConfig()

  console.log('[storage]', config.storage)

  let driver: Driver | null = null

  if (config.storage === 'fs') {
    driver = fsLite({
      base: resolve(process.cwd(), '.data'),
    })
  } else if (config.storage === 's3') {
    driver = s3({
      bucket: process.env.S3_BUCKET,
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    })
  } else if (config.storage === 'r2') {
    driver = r2({
      bucket: config.R2_BUCKET,
    })
  }

  if (!driver) {
    throw new Error(`Invalid storage type: ${config.storage}`)
  }

  storage.mount('tarballs', driver)
})
