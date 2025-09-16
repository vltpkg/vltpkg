import fsDriver from 'unstorage/drivers/fs-lite'
import { resolve } from 'node:path'
import { defineDriver } from 'unstorage'

const tarballsDriver = defineDriver(() => {
  const driver = fsDriver({
    base: resolve(import.meta.dirname, '../.tarballs'),
  })

  // console.log(driver)

  // const setItem = driver.setItem

  // driver.setItem = async (key, value, _opts) => {
  //   console.log('setItem', key)
  //   return setItem(key, value, _opts)
  // }

  // return driver

  return {
    name: 'huh-what-the-tarballs',
    setItem: async (key, value, _opts) => {
      console.log('setItem', key, value)
      return driver.setItem(key, value, _opts)
    },
    hasItem: async (key, _opts) => {
      console.log('hasItem', key)
      return false
    },
    getItem: async (key, _opts) => {
      console.log('getItem', key)
      return undefined
    },
    getKeys: async (base, _opts) => {
      console.log('getKeys', base)
      return []
    },
    clear: async (base, _opts) => {
      console.log('clear', base)
    },
    dispose: async () => {
      console.log('dispose')
    },
    watch: async () => {
      console.log('watch')
    },
  }
})

export default tarballsDriver
