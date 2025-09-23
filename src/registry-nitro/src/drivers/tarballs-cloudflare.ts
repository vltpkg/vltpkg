import { createStorage } from 'unstorage'
import cloudflareR2BindingDriver from 'unstorage/drivers/cloudflare-r2-binding'
import {
  defineTarballsDriver,
  type TarballsFsDriver,
} from './tarballs.ts'
import { getDb } from '../db/d1.ts'

const storage = createStorage({
  driver: cloudflareR2BindingDriver({ binding: 'BUCKET' }),
})

const fsDriver: TarballsFsDriver = {
  hasItem: async key => {
    console.log('hasItem', key)
    const x = await storage.hasItem(key)
    console.log('hasItem x', x)
    return x
  },
  getItemRaw: async key => {
    const value = await storage.getItemRaw(key, { type: 'object' })
    console.log('getItemRaw', key, value)
    return value
  },
  setItemRaw: async (key, value) => {
    console.log('setItemRaw', key, value)
    await storage.setItemRaw(key, value)
  },
}

export default defineTarballsDriver(getDb, fsDriver)
