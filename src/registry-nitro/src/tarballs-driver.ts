import fsDriver from 'unstorage/drivers/fs-lite'
import { resolve } from 'node:path'
import { defineDriver } from 'unstorage'

const tarballsDriver = defineDriver(() => {
  const driver = fsDriver({
    base: resolve(import.meta.dirname, '../.tarballs'),
  })

  return {
    name: 'huh-what-the-tarballs',
    setItem: async (key, value, _opts) => {
      console.log('setItem', key)
      // const parsed = JSON.parse(value)
      // const body = parsed.value.body
      // return driver.setItem(key, body, _opts)
    },
    hasItem: async (key, _opts) => {
      return false
    },
    getItem: async (key, _opts) => {
      return undefined
    },
    getKeys: async (base, _opts) => {
      return []
    },
    clear: async (base, _opts) => {},
    dispose: async () => {},
    watch: async () => {
      return () => {}
    },
  }
})

export default tarballsDriver
