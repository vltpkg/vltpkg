import { defineEventHandler } from 'h3'

export default defineEventHandler(event => {
  // TODO: rerouting
  return { hello: 'world' }
})
