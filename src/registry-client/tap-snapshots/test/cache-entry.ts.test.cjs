/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/cache-entry.ts > TAP > inspect value (should include color codes for displayed object) 1`] = `
@vltpkg/registry-client.CacheEntry {
  statusCode: [33m200[39m,
  headers: [
    [ [32m'key'[39m, [32m'value'[39m ],
    [ [32m'x'[39m, [32m'y'[39m ],
    [
      [32m'integrity'[39m,
      [32m'sha512-ySpg5uL81UchHRtZ6rp4W9o9t6N/Gk8IZmtNs29m67Dt/ZQjqNsm5HIPDcujWGvEHPsTtI5dCR7nLHRqanslfA=='[39m
    ]
  ],
  contentType: [32m''[39m,
  integrity: [32m'sha512-ySpg5uL81UchHRtZ6rp4W9o9t6N/Gk8IZmtNs29m67Dt/ZQjqNsm5HIPDcujWGvEHPsTtI5dCR7nLHRqanslfA=='[39m,
  cacheControl: {},
  valid: [33mfalse[39m,
  staleWhileRevalidate: [33mtrue[39m,
  maxAge: [33m300[39m,
  isGzip: [33mfalse[39m,
  isJSON: [33mfalse[39m
}
`

exports[`test/cache-entry.ts > TAP > inspect value should not dump excessively large body text 1`] = `
@vltpkg/registry-client.CacheEntry {
  statusCode: 200,
  headers: [ [ 'content-encoding', 'identity' ], [ 'content-length', '1024' ] ],
  contentType: '',
  cacheControl: {},
  valid: false,
  staleWhileRevalidate: true,
  maxAge: 300,
  isGzip: false,
  isJSON: false
}
`

exports[`test/cache-entry.ts > TAP > inspect value should not dump noisy binary data 1`] = `
@vltpkg/registry-client.CacheEntry {
  statusCode: 200,
  headers: [ [ 'content-encoding', 'identity' ], [ 'content-length', '6' ] ],
  contentType: '',
  cacheControl: {},
  valid: false,
  staleWhileRevalidate: true,
  maxAge: 300,
  isGzip: false,
  isJSON: false
}
`
