import { defineDriver } from 'unstorage'
import { db } from './db/index.ts'
import * as Schema from './db/schema.ts'
import { eq, like } from 'drizzle-orm'

const packageStorageDriver = defineDriver(() => {
  return {
    name: 'packages-storage',
    options: {},

    async getItem(key, _opts) {
      const keyId = key.split(':').pop()!
      const isPackage = keyId.startsWith('npm___package___')
      const isVersion = keyId.startsWith('npm___version___')

      const [response] = await db
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
        const [packumentRow] = await db
          .select()
          .from(Schema.packages)
          .where(eq(Schema.packages.name, packageName))
          .limit(1)
          .execute()

        if (!packumentRow) {
          return undefined
        }

        const packument = JSON.parse(packumentRow.packument)

        const versionRows = await db
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
            versionRows.map(version => {
              // split on the last @ and take the last part
              return [
                version.spec.split('@').pop()!,
                JSON.parse(version.manifest),
              ]
            }),
          ),
        }
      } else if (isVersion) {
        const packageVersion = response.package_version!
        const [version] = await db
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

    async setItem(key, rawValue, _opts) {
      const keyId = key.split(':').pop()!
      const isPackage = keyId.startsWith('npm___package___')
      const isVersion = keyId.startsWith('npm___version___')

      const { expires, mtime, integrity, value } =
        JSON.parse(rawValue)
      const { body: rawBody, ...valueWithoutBody } = value
      const body = JSON.parse(rawBody)
      const name: string = body.name

      const stringifiedValueWithoutBody =
        JSON.stringify(valueWithoutBody)
      await db
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
        await db
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

        // TODO: This should be done in a single transaction
        for (const [version, manifest] of Object.entries(versions)) {
          const spec = `${name}@${version}`

          const stringifiedManifest = JSON.stringify(manifest)
          await db
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
      }

      if (isVersion) {
        const spec = `${name}@${body.version}`

        const stringifiedManifest = JSON.stringify(body)
        await db
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

export default packageStorageDriver
