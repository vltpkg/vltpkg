/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/prerelease.ts > TAP > :prerelease pseudo-selector > excludes non-prerelease versions > must match snapshot 1`] = `
Array [
  "1.2.3-rc.1+rev.2",
  "1.3.4-beta.1",
]
`

exports[`test/pseudo/prerelease.ts > TAP > :prerelease pseudo-selector > handles nodes with invalid semver > must match snapshot 1`] = `
Object {
  "nodes": Array [],
}
`

exports[`test/pseudo/prerelease.ts > TAP > :prerelease pseudo-selector > handles nodes without version > must match snapshot 1`] = `
Object {
  "nodes": Array [],
}
`

exports[`test/pseudo/prerelease.ts > TAP > :prerelease pseudo-selector > handles various prerelease formats > must match snapshot 1`] = `
Object {
  "selected": Array [
    Object {
      "name": "alpha",
      "version": "2.1.0-alpha.1",
    },
    Object {
      "name": "beta",
      "version": "1.0.0-beta.0",
    },
    Object {
      "name": "build-meta",
      "version": "1.2.3-alpha.1+build.123",
    },
    Object {
      "name": "canary",
      "version": "19.2.0-canary-fa3feba6-20250623",
    },
    Object {
      "name": "dev",
      "version": "0.0.0-16",
    },
    Object {
      "name": "next",
      "version": "1.5.0-next.1",
    },
    Object {
      "name": "rc",
      "version": "3.0.0-rc.2",
    },
    Object {
      "name": "snapshot",
      "version": "2.0.0-snapshot.20231201",
    },
  ],
  "total": 10,
}
`

exports[`test/pseudo/prerelease.ts > TAP > :prerelease pseudo-selector > removes dangling edges properly > must match snapshot 1`] = `
Object {
  "edgeNames": Array [
    "e",
    "g",
  ],
  "initialEdges": 8,
  "remainingEdges": 2,
}
`

exports[`test/pseudo/prerelease.ts > TAP > :prerelease pseudo-selector > selects only nodes with prerelease versions > must match snapshot 1`] = `
Object {
  "edges": Array [
    "g",
    "e",
  ],
  "nodes": Array [
    Object {
      "name": "g",
      "version": "1.2.3-rc.1+rev.2",
    },
    Object {
      "name": "e",
      "version": "1.3.4-beta.1",
    },
  ],
}
`

exports[`test/pseudo/prerelease.ts > TAP > :prerelease pseudo-selector > works with simple graph (no prereleases) > must match snapshot 1`] = `
Object {
  "nodes": Array [],
}
`
