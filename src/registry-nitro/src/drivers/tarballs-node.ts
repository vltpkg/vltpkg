import { defineTarballsDriver } from './tarballs.ts'
import { getDb } from '../db/libsql.ts'
import * as schema from '../db/schema.ts'
import { access } from 'node:fs/promises'
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
} from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { join, resolve } from 'node:path'
import type { ReadStream } from 'node:fs'
import type { TarballsFsDriver } from './tarballs.ts'

const base = resolve(process.cwd(), '.data/tarballs')
mkdirSync(base, { recursive: true })

const fsDriver: TarballsFsDriver = {
  hasItem: (key: string) =>
    access(join(base, key))
      .then(() => true)
      .catch(() => false),
  getItemRaw: async (key: string) =>
    createReadStream(join(base, key)),
  setItemRaw: (key: string, value: ReadStream) => {
    return pipeline(value, createWriteStream(key))
  },
}

export default defineTarballsDriver(getDb, fsDriver, schema)
