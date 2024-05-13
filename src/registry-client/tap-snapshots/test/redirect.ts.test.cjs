/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/redirect.ts > TAP > redirect > 303, strip body and make it a GET 1`] = `
Array [
  URL {
    "hash": "",
    "host": "example.com",
    "hostname": "example.com",
    "href": "https://example.com/x",
    "origin": "https://example.com",
    "password": "",
    "pathname": "/x",
    "port": "",
    "protocol": "https:",
    "search": "",
    "searchParams": URLSearchParams [],
    "username": "",
  },
  Object {
    "body": undefined,
    "maxRedirections": 30,
    "method": "GET",
    "redirections": Set {
      "https://example.com/a",
      "https://example.com/b",
      "https://example.com/c",
      "https://example.com/x",
    },
  },
]
`

exports[`test/redirect.ts > TAP > redirect > no redirections, just return [] 1`] = `
Array []
`

exports[`test/redirect.ts > TAP > redirect > return redirect settings 1`] = `
Array [
  URL {
    "hash": "",
    "host": "example.com",
    "hostname": "example.com",
    "href": "https://example.com/x",
    "origin": "https://example.com",
    "password": "",
    "pathname": "/x",
    "port": "",
    "protocol": "https:",
    "search": "",
    "searchParams": URLSearchParams [],
    "username": "",
  },
  Object {
    "maxRedirections": 30,
    "redirections": Set {
      "https://example.com/a",
      "https://example.com/b",
      "https://example.com/c",
      "https://example.com/x",
    },
  },
]
`
