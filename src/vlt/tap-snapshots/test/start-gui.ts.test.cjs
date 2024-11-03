/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/start-gui.ts > TAP > e2e server test > should copy all files to tmp directory 1`] = `
Array [
  "dashboard.json",
  "favicon.ico",
  "graph.json",
  "icons",
  "index.html",
  "index.js",
  "index.js.map",
  "main.css",
]
`

exports[`test/start-gui.ts > TAP > e2e server test > should log the server start message 1`] = `
Array [
  "⚡️ vlt GUI running at http://localhost:8017",
]
`

exports[`test/start-gui.ts > TAP > e2e server test > should update graph.json with new data 1`] = `
{
  "hasDashboard": true,
  "importers": [
    {
      "id": "file·.",
      "name": "other-project",
      "location": ".",
      "importer": true,
      "manifest": {
        "name": "other-project"
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  ],
  "lockfile": {
    "options": {},
    "nodes": {},
    "edges": {}
  }
}
`

exports[`test/start-gui.ts > TAP > e2e server test > should write graph.json with data from the current project 1`] = `
{
  "hasDashboard": true,
  "importers": [
    {
      "id": "file·.",
      "name": "my-project",
      "version": "1.0.0",
      "location": ".",
      "importer": true,
      "manifest": {
        "name": "my-project",
        "version": "1.0.0",
        "dependencies": {
          "@scoped/a": "^1.0.0",
          "@scoped/b": "^1.0.0",
          "foo": "^1.0.0",
          "bar": "^1.0.0",
          "link": "file:./linked",
          "missing": "^1.0.0"
        },
        "bundleDependencies": [
          "bundled"
        ],
        "optionalDependencies": {
          "bar": "^1.0.0"
        },
        "devDependencies": {
          "aliased": "custom:foo@^1.0.0"
        }
      },
      "projectRoot": "{ROOT}",
      "dev": false,
      "optional": false
    }
  ],
  "lockfile": {
    "options": {},
    "nodes": {},
    "edges": {
      "file·. aliased": "dev custom:foo@^1.0.0 MISSING",
      "file·. bar": "optional ^1.0.0 MISSING",
      "file·. @scoped/a": "prod ^1.0.0 MISSING",
      "file·. @scoped/b": "prod ^1.0.0 MISSING",
      "file·. foo": "prod ^1.0.0 MISSING",
      "file·. link": "prod file:./linked MISSING",
      "file·. missing": "prod ^1.0.0 MISSING"
    }
  }
}
`

exports[`test/start-gui.ts > TAP > no data to be found > should not create json files if no data was found 1`] = `
Array [
  "favicon.ico",
  "icons",
  "index.html",
  "index.js",
  "index.js.map",
  "main.css",
]
`

exports[`test/start-gui.ts > TAP > starts gui data and server > should copy all files to tmp directory 1`] = `
Array [
  "dashboard.json",
  "favicon.ico",
  "graph.json",
  "icons",
  "index.html",
  "index.js",
  "index.js.map",
  "main.css",
]
`

exports[`test/start-gui.ts > TAP > starts gui data and server > should log the server start message 1`] = `
Array [
  "⚡️ vlt GUI running at http://localhost:7017",
]
`

exports[`test/start-gui.ts > TAP > starts gui data and server > should write empty graph.json used in tests 1`] = `
Object {
  "hasDashboard": true,
  "importers": Array [],
  "lockfile": Object {
    "edges": Object {},
    "importers": Array [],
    "nodes": Object {},
    "options": Object {},
  },
}
`
