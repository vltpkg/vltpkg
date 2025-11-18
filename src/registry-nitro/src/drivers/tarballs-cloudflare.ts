import { createStorage } from 'unstorage'
import cloudflareR2BindingDriver from 'unstorage/drivers/cloudflare-r2-binding'
import { defineTarballsDriver } from './tarballs.ts'
import type { TarballsFsDriver } from './tarballs.ts'
import { getDb } from '../db/d1.ts'
import * as schema from '../db/schema.ts'

const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: 'BUCKET' }),
})

const fsDriver: TarballsFsDriver = {
  hasItem: async key => {
    const value = await storage.hasItem(key)
    return value
  },
  getItemRaw: async key => {
    const value = await storage.getItemRaw(key, { type: 'stream' })
    return value
  },
  setItemRaw: async (key, value) => {
    await storage.setItemRaw(key, value)
  },
}

export default defineTarballsDriver(getDb, fsDriver, schema)
