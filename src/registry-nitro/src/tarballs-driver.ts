import { resolve } from 'node:path'
import { defineDriver } from 'unstorage'
import * as Schema from './db/schema.ts'
import { db } from './db/index.ts'
import { access } from 'node:fs/promises'
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
} from 'node:fs'
import { eq } from 'drizzle-orm'
import { basename } from 'node:path'
import { pipeline } from 'node:stream/promises'

const tarballsDriver = defineDriver(() => {
  const base = resolve(process.cwd(), '.data/tarballs')
  mkdirSync(base, { recursive: true })

  const getFilePath = (key: string) => {
    const keyId = key
      .split(':')
      .pop()!
      .replace('npm___tarball___', '')
    const keyBase = basename(keyId, '.json')
    return resolve(base, keyBase) + '.tgz'
  }

  return {
    name: 'tarballs-storage',

    async getItem(key) {
      const [response] = await db
        .select()
        .from(Schema.tarballResponses)
        .where(eq(Schema.tarballResponses.key, key))
        .limit(1)
        .execute()

      if (!response) {
        return undefined
      }

      const exists = await access(getFilePath(key))
        .then(() => true)
        .catch(() => false)

      if (!exists) {
        return undefined
      }

      return {
        expires: response.expires,
        mtime: response.mtime,
        integrity: response.integrity,
        value: {
          ...JSON.parse(response.value),
          body: createReadStream(getFilePath(key)),
        },
      }
    },

    async setItemRaw(key, { expires, mtime, integrity, value }) {
      const { body, ...valueWithoutBody } = value

      const stringifiedValueWithoutBody =
        JSON.stringify(valueWithoutBody)
      await db
        .insert(Schema.tarballResponses)
        .values({
          key,
          value: stringifiedValueWithoutBody,
          expires,
          mtime,
          integrity,
        })
        .onConflictDoUpdate({
          target: Schema.tarballResponses.key,
          set: {
            value: stringifiedValueWithoutBody,
            expires,
            mtime,
            integrity,
          },
        })

      await pipeline(body, createWriteStream(getFilePath(key)))
    },

    // Not implemented since the Nitro's cache event handler does not use them
    async hasItem(key) {
      return false
    },
    async removeItem(key) {},
    async getKeys(base) {
      return []
    },
    async clear(base) {},
    async dispose() {},
    async watch() {
      return () => {}
    },
  }
})

export default tarballsDriver
