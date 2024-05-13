/**
 * Determine whether we're allowed to cache it, based on status code
 */
export const isCacheable = (statusCode: number) =>
  statusCode < 200 ? false
  : statusCode < 300 ? true
  : statusCode === 301 ? true
  : statusCode === 308 ? true
  : statusCode === 410 ? true
  : false
