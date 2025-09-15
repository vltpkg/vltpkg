import { defineEventHandler, HTTPError } from 'h3'

export default defineEventHandler(event => {
  // TODO: rerouting
  console.log('Not Found', event.req.url)
  // throw new HTTPError({
  //   statusCode: 404,
  //   statusMessage: 'Not Found',
  //   message: 'Not Found',
  // })
  return { error: 'Not Found' }
})
