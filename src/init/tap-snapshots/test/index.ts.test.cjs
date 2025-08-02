/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > init > should init a new package.json file 1`] = `
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": {
    "name": "User",
    "email": "foo@bar.ca"
  }
}

`

exports[`test/index.ts > TAP > init > should initialize the data 1`] = `
Object {
  "manifest": Object {
    "data": Object {
      "author": Object {
        "email": "foo@bar.ca",
        "name": "User",
        [Symbol.for(isPublisher)]: false,
        [Symbol.for(writeAccess)]: false,
      },
      "description": "",
      "main": "index.js",
      "name": "my-project",
      "version": "1.0.0",
    },
    "path": "{CWD}/.tap/fixtures/test-index.ts-init/my-project/package.json",
  },
}
`

exports[`test/index.ts > TAP > init > should output expected logs 1`] = `
Array []
`

exports[`test/index.ts > TAP > init with author info > should init a new package.json file with author info 1`] = `
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": {
    "name": "Ruy Adorno"
  }
}

`

exports[`test/index.ts > TAP > init with author info > should output expected message with author info 1`] = `
Object {
  "manifest": Object {
    "data": Object {
      "author": Object {
        "email": undefined,
        "name": "Ruy Adorno",
        [Symbol.for(isPublisher)]: false,
        [Symbol.for(writeAccess)]: false,
      },
      "description": "",
      "main": "index.js",
      "name": "my-project",
      "version": "1.0.0",
    },
    "path": "{CWD}/.tap/fixtures/test-index.ts-init-with-author-info/my-project/package.json",
  },
}
`

exports[`test/index.ts > TAP > missing user info > should init a new package.json file with no user info 1`] = `
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js"
}

`

exports[`test/index.ts > TAP > missing user info > should initialize with data 1`] = `
Object {
  "manifest": Object {
    "data": Object {
      "description": "",
      "main": "index.js",
      "name": "my-project",
      "version": "1.0.0",
    },
    "path": "{CWD}/.tap/fixtures/test-index.ts-missing-user-info/my-project/package.json",
  },
}
`

exports[`test/index.ts > TAP > missing user info > should output expected message when no user info is found 1`] = `
Array []
`
