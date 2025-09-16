import { resolve } from 'node:path'
import { defineDriver } from 'unstorage'
import * as Schema from './db/schema.ts'
import { db } from './db/index.ts'
import { readFile, writeFile } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { basename } from 'node:path'

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

    async getItem(key, _opts) {
      const [response] = await db
        .select()
        .from(Schema.tarballResponses)
        .where(eq(Schema.tarballResponses.key, key))
        .limit(1)
        .execute()

      if (!response) {
        return undefined
      }

      const buffer = await readFile(getFilePath(key)).catch(
        () => undefined,
      )

      if (!buffer) {
        return undefined
      }

      return {
        expires: response.expires,
        mtime: response.mtime,
        integrity: response.integrity,
        value: {
          ...JSON.parse(response.value),
          body: Array.from(new Uint8Array(buffer)),
        },
      }
    },

    async setItem(key, rawValue, _opts) {
      const { expires, mtime, integrity, value } =
        JSON.parse(rawValue)
      const { body: rawBody, ...valueWithoutBody } = value

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

      const buffer = new Uint8Array(rawBody)
      await writeFile(getFilePath(key), buffer)
    },

    // Not implemented since the Nitro's cache event handler does not use them
    async hasItem(key, _opts) {
      return false
    },
    async removeItem(key, _opts) {},
    async getKeys(base, _opts) {
      return []
    },
    async clear(base, _opts) {},
    async dispose() {},
    async watch() {
      return () => {}
    },
  }
})

export default tarballsDriver
