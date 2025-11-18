import { createStorage } from 'unstorage'
import s3Driver from 'unstorage/drivers/s3'
import { defineTarballsDriver } from './tarballs.ts'
import type { TarballsFsDriver } from './tarballs.ts'
import { getDb } from '../db/neon.ts'
import * as schema from '../db/schema-postgres.ts'

const storage = createStorage({
  driver: s3Driver({
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    endpoint: process.env.S3_ENDPOINT!,
  }),
})

const fsDriver: TarballsFsDriver = {
  hasItem: async key => {
    const value = await storage.hasItem(key)
    return value
  },
  getItemRaw: async key => {
    const value = await storage.getItemRaw(key)
    return value
  },
  setItemRaw: async (key, value) => {
    await storage.setItemRaw(key, value)
  },
}

export default defineTarballsDriver(getDb, fsDriver, schema)
