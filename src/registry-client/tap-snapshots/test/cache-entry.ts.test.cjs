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
  headers: [ [ [32m'key'[39m, [32m'value'[39m ], [ [32m'x'[39m, [32m'y'[39m ] ],
  text: [32m''[39m,
  contentType: [32m''[39m,
  date: [90mundefined[39m,
  cacheControl: {},
  valid: [33mfalse[39m,
  staleWhileRevalidate: [33mtrue[39m,
  age: [90mundefined[39m
}
`

exports[`test/cache-entry.ts > TAP > inspect value should not dump excessively large body text 1`] = `
@vltpkg/registry-client.CacheEntry {
  statusCode: 200,
  headers: [ [ 'content-encoding', 'identity' ], [ 'content-length', '1024' ] ],
  text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa…',
  contentType: '',
  date: undefined,
  cacheControl: {},
  valid: false,
  staleWhileRevalidate: true,
  age: undefined
}
`

exports[`test/cache-entry.ts > TAP > inspect value should not dump noisy binary data 1`] = `
@vltpkg/registry-client.CacheEntry {
  statusCode: 200,
  headers: [ [ 'content-encoding', 'identity' ], [ 'content-length', '6' ] ],
  text: '[binary data]',
  contentType: '',
  date: undefined,
  cacheControl: {},
  valid: false,
  staleWhileRevalidate: true,
  age: undefined
}
`
