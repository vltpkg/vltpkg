import { defineDriver } from 'unstorage'
import { eq } from 'drizzle-orm'
import { basename } from 'node:path'
import type { ReadStream } from 'node:fs'

export type TarballsFsDriver = {
  hasItem: (key: string) => Promise<boolean>
  getItemRaw: (key: string) => Promise<ReadStream>
  setItemRaw: (key: string, value: ReadStream) => Promise<void>
}

// Define a schema interface that both SQLite and Postgres schemas must implement
interface DatabaseSchema {
  tarballResponses: any
}

// Define a generic database type that accepts any Drizzle database with our schema
type UnifiedDatabase = {
  select: () => any
  insert: (table: any) => any
  update: (table: any) => any
  delete: (table: any) => any
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const defineTarballsDriver = <TSchema extends DatabaseSchema>(
  getDb: () => UnifiedDatabase,
  fsDriver: TarballsFsDriver,
  schema: TSchema,
) =>
  defineDriver(() => {
    const Schema = schema
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

        console.time(`[cache] read tarball ${key}`)
        const [[response], exists] = await Promise.all([
          getDb()
            .select()
            .from(Schema.tarballResponses)
            .where(eq(Schema.tarballResponses.key, key))
            .limit(1)
            .execute(),
          fsDriver.hasItem(getFilePath(key)),
        ])
        console.timeEnd(`[cache] read tarball ${key}`)

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
      async hasItem(_key) {
        return false
      },
      async removeItem(_key) {},
      async getKeys(_base) {
        return []
      },
      async clear(_base) {},
      async dispose() {},
      async watch() {
        return () => {}
      },
    }
  })
