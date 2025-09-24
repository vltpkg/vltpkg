import { defineNitroPlugin } from 'nitro/runtime'

export default defineNitroPlugin(nitro => {
  nitro.hooks.hook('request', event => {
    console.log(event.req.method, event.req.url)
  })
  nitro.hooks.hook('error', err => {
    console.log('Nitro error', err)
  })
})
