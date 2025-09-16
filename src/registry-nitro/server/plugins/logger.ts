import { defineNitroPlugin } from 'nitro/runtime'

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('request', event => {
    console.log(event.req.method, event.req.url)
  })
})
