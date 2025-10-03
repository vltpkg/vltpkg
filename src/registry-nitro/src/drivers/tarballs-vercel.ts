import { createStorage } from 'unstorage'
import vercelBlobDriver from 'unstorage/drivers/vercel-blob'
import {
  defineTarballsDriver,
  type TarballsFsDriver,
} from './tarballs.ts'
import { getDb } from '../db/turso.ts'

const storage = createStorage({
  driver: vercelBlobDriver({
    access: 'public', // Required! Beware that stored data is publicly accessible.
    // token: "<your secret token>", // or set BLOB_READ_WRITE_TOKEN
    // base: "unstorage",
    // envPrefix: "BLOB",
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

export default defineTarballsDriver(getDb, fsDriver)
