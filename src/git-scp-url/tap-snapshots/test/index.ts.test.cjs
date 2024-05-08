/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > foo://user@host.com/repo 1`] = `
URL {
  "hash": "",
  "host": "host.com",
  "hostname": "host.com",
  "href": "foo://user@host.com/repo",
  "origin": "null",
  "password": "",
  "pathname": "/repo",
  "port": "",
  "protocol": "foo:",
  "search": "",
  "searchParams": URLSearchParams [],
  "username": "user",
}
`

exports[`test/index.ts > TAP > foo://user@host.com/repo#hash 1`] = `
URL {
  "hash": "#hash",
  "host": "host.com",
  "hostname": "host.com",
  "href": "foo://user@host.com/repo#hash",
  "origin": "null",
  "password": "",
  "pathname": "/repo",
  "port": "",
  "protocol": "foo:",
  "search": "",
  "searchParams": URLSearchParams [],
  "username": "user",
}
`

exports[`test/index.ts > TAP > git@github.com:user/repo 1`] = `
URL {
  "hash": "",
  "host": "github.com",
  "hostname": "github.com",
  "href": "git+ssh://git@github.com/user/repo",
  "origin": "null",
  "password": "",
  "pathname": "/user/repo",
  "port": "",
  "protocol": "git+ssh:",
  "search": "",
  "searchParams": URLSearchParams [],
  "username": "git",
}
`

exports[`test/index.ts > TAP > git+ssh://git@github.com/user/repo 1`] = `
URL {
  "hash": "",
  "host": "github.com",
  "hostname": "github.com",
  "href": "git+ssh://git@github.com/user/repo",
  "origin": "null",
  "password": "",
  "pathname": "/user/repo",
  "port": "",
  "protocol": "git+ssh:",
  "search": "",
  "searchParams": URLSearchParams [],
  "username": "git",
}
`

exports[`test/index.ts > TAP > hello, this is not a valid url, no matter what we do 1`] = `
undefined
`

exports[`test/index.ts > TAP > ssh://git@github.com:user/repo 1`] = `
URL {
  "hash": "",
  "host": "github.com",
  "hostname": "github.com",
  "href": "ssh://git@github.com/user/repo",
  "origin": "null",
  "password": "",
  "pathname": "/user/repo",
  "port": "",
  "protocol": "ssh:",
  "search": "",
  "searchParams": URLSearchParams [],
  "username": "git",
}
`

exports[`test/index.ts > TAP > ssh:git@github.com:user/repo 1`] = `
URL {
  "hash": "",
  "host": "github.com",
  "hostname": "github.com",
  "href": "ssh://git@github.com/user/repo",
  "origin": "null",
  "password": "",
  "pathname": "/user/repo",
  "port": "",
  "protocol": "ssh:",
  "search": "",
  "searchParams": URLSearchParams [],
  "username": "git",
}
`

exports[`test/index.ts > TAP > user:password@github.com:user/repo 1`] = `
URL {
  "hash": "",
  "host": "github.com",
  "hostname": "github.com",
  "href": "git+ssh://user:password@github.com/user/repo",
  "origin": "null",
  "password": "password",
  "pathname": "/user/repo",
  "port": "",
  "protocol": "git+ssh:",
  "search": "",
  "searchParams": URLSearchParams [],
  "username": "user",
}
`

exports[`test/index.ts > TAP > user:password@github.com:user/repo#hash 1`] = `
URL {
  "hash": "#hash",
  "host": "github.com",
  "hostname": "github.com",
  "href": "git+ssh://user:password@github.com/user/repo#hash",
  "origin": "null",
  "password": "password",
  "pathname": "/user/repo",
  "port": "",
  "protocol": "git+ssh:",
  "search": "",
  "searchParams": URLSearchParams [],
  "username": "user",
}
`
