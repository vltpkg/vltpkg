import { defineDriver } from 'unstorage'
import * as Schema from '../db/schema.ts'
import { eq, like, sql } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { text } from 'stream/consumers'

export const definePackagesDriver = (
  getDb: () => LibSQLDatabase | DrizzleD1Database,
) =>
  defineDriver(() => {
    return {
      name: 'packages-storage',
      options: {},

      async getItem(key) {
        const keyId = key.split(':').pop()!
        const isPackage = keyId.startsWith('npm___package___')
        const isVersion = keyId.startsWith('npm___version___')

        const [response] = await getDb()
          .select()
          .from(Schema.packageResponses)
          .where(eq(Schema.packageResponses.key, key))
          .limit(1)
          .execute()

        if (!response) {
          return undefined
        }

        const packageName = response.package_name

        let body: any

        if (isPackage) {
          const [packumentRow] = await getDb()
            .select()
            .from(Schema.packages)
            .where(eq(Schema.packages.name, packageName))
            .limit(1)
            .execute()

          if (!packumentRow) {
            return undefined
          }

          const packument = JSON.parse(packumentRow.packument)

          const versionRows = await getDb()
            .select()
            .from(Schema.versions)
            .where(like(Schema.versions.spec, `${packageName}@%`))
            .execute()

          if (versionRows.length === 0) {
            return undefined
          }

          body = {
            ...packument,
            versions: Object.fromEntries(
              versionRows.map(version => [
                version.spec.split('@').pop()!,
                JSON.parse(version.manifest),
              ]),
            ),
          }
        } else if (isVersion) {
          const packageVersion = response.package_version!
          const [version] = await getDb()
            .select()
            .from(Schema.versions)
            .where(
              eq(
                Schema.versions.spec,
                `${packageName}@${packageVersion}`,
              ),
            )
            .limit(1)
            .execute()

          if (!version) {
            return undefined
          }

          body = JSON.parse(version.manifest)
        }

        const x = {
          expires: response.expires,
          mtime: response.mtime,
          integrity: response.integrity,
          value: {
            ...JSON.parse(response.value),
            body: JSON.stringify(body),
          },
        }

        return x
      },

      async setItemRaw(key, { expires, mtime, integrity, value }) {
        const keyId = key.split(':').pop()!
        const isPackage = keyId.startsWith('npm___package___')
        const isVersion = keyId.startsWith('npm___version___')

        const { body: bodyStream, ...valueWithoutBody } = value

        const bodyText = await text(bodyStream)
        const body = JSON.parse(bodyText)
        const name: string = body.name

        const stringifiedValueWithoutBody =
          JSON.stringify(valueWithoutBody)
        await getDb()
          .insert(Schema.packageResponses)
          .values({
            key,
            value: stringifiedValueWithoutBody,
            expires,
            mtime,
            integrity,
            package_name: name,
            package_version: isVersion ? body.version : null,
          })
          .onConflictDoUpdate({
            target: Schema.packageResponses.key,
            set: {
              value: stringifiedValueWithoutBody,
              expires,
              mtime,
              integrity,
            },
          })

        if (isPackage) {
          const { versions, ...packument } = body
          const stringifiedPackument = JSON.stringify(packument)
          await getDb()
            .insert(Schema.packages)
            .values({
              name,
              packument: stringifiedPackument,
            })
            .onConflictDoUpdate({
              target: Schema.packages.name,
              set: {
                packument: stringifiedPackument,
              },
            })

          await getDb()
            .insert(Schema.versions)
            .values(
              Object.entries(versions).map(([version, manifest]) => ({
                spec: `${name}@${version}`,
                manifest: JSON.stringify(manifest),
              })),
            )
            .onConflictDoUpdate({
              target: Schema.versions.spec,
              set: {
                manifest: sql.raw(
                  `excluded.${Schema.versions.manifest.name}`,
                ),
              },
            })
        }

        if (isVersion) {
          const spec = `${name}@${body.version}`

          const stringifiedManifest = JSON.stringify(body)
          await getDb()
            .insert(Schema.versions)
            .values({
              spec,
              manifest: stringifiedManifest,
            })
            .onConflictDoUpdate({
              target: Schema.versions.spec,
              set: {
                manifest: stringifiedManifest,
              },
            })
        }
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
