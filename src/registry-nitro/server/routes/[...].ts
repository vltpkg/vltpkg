import { defineEventHandler, HTTPError } from 'h3'

export default defineEventHandler(event => {
  throw HTTPError.status(404, 'Not Found')
})
