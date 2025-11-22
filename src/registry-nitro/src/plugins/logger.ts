import { definePlugin } from 'nitro'
import type { HTTPEvent } from 'nitro/h3'

export default definePlugin(nitro => {
  nitro.hooks.hook('request', (event: HTTPEvent) => {
    console.log(event.req.method, event.req.url)
  })
  nitro.hooks.hook('error', (err: Error) => {
    console.log('Nitro error', err)
  })
})
