import { defineEventHandler } from 'h3'

export default defineEventHandler(event => {
  event.res.headers.set('npm-notice', 'PONG')
  return {}
})
