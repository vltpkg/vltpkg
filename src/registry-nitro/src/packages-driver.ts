import { defineDriver } from 'unstorage'
import { db } from './db/index.ts'
import { packages, versions } from './db/schema.ts'

const packageStorageDriver = defineDriver(() => {
  return {
    name: 'package-storage',
    options: {},
    async hasItem(key, _opts) {
      // console.log('hasItem', key, _opts)
      return false
    },
    async getItem(key, _opts) {
      // console.log('getItem', key, _opts)
      return undefined
    },

    async setItem(key, value, _opts) {
      console.log('setItem', key)
      // value is a JSON string containing an object with shape: { value: { body: stringifiedPackument } }
      const parsedValue = JSON.parse(value)
      // console.log(parsedValue)
      const pkg = JSON.parse(parsedValue.value.body)

      const name: string = pkg.name
      const distTags: Record<string, string> = pkg['dist-tags'] ?? {}
      const versionsMap: Record<string, unknown> = pkg.versions ?? {}
      const timeMap: Record<string, string> = pkg.time ?? {}

      const cachedAt: string = new Date().toISOString()

      const lastUpdated: string =
        timeMap.modified ?? new Date().toISOString()

      // Upsert package row
      await db
        .insert(packages)
        .values({
          name,
          tags: JSON.stringify(distTags),
          lastUpdated,
          cachedAt,
        })
        .onConflictDoUpdate({
          target: packages.name,
          set: {
            tags: JSON.stringify(distTags),
            lastUpdated,
            cachedAt,
          },
        })

      // Upsert each version row
      for (const [version, manifest] of Object.entries(versionsMap)) {
        const spec = `${name}@${version}`
        const publishedAt =
          timeMap[version] ?? new Date().toISOString()

        await db
          .insert(versions)
          .values({
            spec,
            manifest: JSON.stringify(manifest),
            publishedAt,
            cachedAt,
          })
          .onConflictDoUpdate({
            target: versions.spec,
            set: {
              manifest: JSON.stringify(manifest),
              publishedAt,
              cachedAt,
            },
          })
      }
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
