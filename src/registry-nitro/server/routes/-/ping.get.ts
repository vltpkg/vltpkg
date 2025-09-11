import { defineEventHandler } from 'h3'

// Learn more: https://nitro.build/guide/routing
export default defineEventHandler(event => {
  event.headers.set('npm-notice', 'PONG')
  return {}
})
