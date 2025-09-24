import { defineDriver } from 'unstorage'
import * as Schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { basename } from 'node:path'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { ReadStream } from 'node:fs'

export type TarballsFsDriver = {
  hasItem: (key: string) => Promise<boolean>
  getItemRaw: (key: string) => Promise<ReadStream>
  setItemRaw: (key: string, value: ReadStream) => Promise<void>
}

export const defineTarballsDriver = (
  getDb: () => LibSQLDatabase | DrizzleD1Database,
  fsDriver: TarballsFsDriver,
) =>
  defineDriver(() => {
    const getFilePath = (key: string) => {
      const keyId = key
        .split(':')
        .pop()!
        .replace('npm___tarball___', '')
      const keyBase = basename(keyId, '.json')
      return keyBase + '.tgz'
    }

    return {
      name: 'tarballs-storage',

      async getItem(key) {
        console.log('[cache] req', key)

        const [[response], exists] = await Promise.all([
          getDb()
            .select()
            .from(Schema.tarballResponses)
            .where(eq(Schema.tarballResponses.key, key))
            .limit(1)
            .execute(),
          fsDriver.hasItem(getFilePath(key)),
        ])

        if (!response || !exists) {
          return undefined
        }

        console.log('[cache] hit', key)

        return {
          expires: response.expires,
          mtime: response.mtime,
          integrity: response.integrity,
          value: {
            ...JSON.parse(response.value),
            body: await fsDriver.getItemRaw(getFilePath(key)),
          },
        }
      },

      async setItemRaw(key, { expires, mtime, integrity, value }) {
        console.log('[cache] set', key)

        const { body, ...valueWithoutBody } = value

        const stringifiedValueWithoutBody =
          JSON.stringify(valueWithoutBody)

        await Promise.all([
          getDb()
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
            }),
          fsDriver.setItemRaw(getFilePath(key), body),
        ])

        console.log('[cache] set done', key)
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
