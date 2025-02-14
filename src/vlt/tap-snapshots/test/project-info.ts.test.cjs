/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/project-info.ts > TAP > getDashboardProjectData > should return the correct dashboard project data 1`] = `
Array [
  Object {
    "manifest": Object {
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "mtime": 1,
    "name": "d",
    "path": "{CWD}/.tap/fixtures/test-project-info.ts-getDashboardProjectData/home/user/projects/d",
    "readablePath": "~/projects/d",
    "tools": Array [
      "pnpm",
    ],
  },
  Object {
    "manifest": Object {
      "name": "c",
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "mtime": 1,
    "name": "c",
    "path": "{CWD}/.tap/fixtures/test-project-info.ts-getDashboardProjectData/home/user/projects/c",
    "readablePath": "~/projects/c",
    "tools": Array [
      "vlt",
    ],
  },
  Object {
    "manifest": Object {
      "engines": Object {
        "node": ">=20",
        "npm": ">=10",
      },
      "name": "a",
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "mtime": 1,
    "name": "a",
    "path": "{CWD}/.tap/fixtures/test-project-info.ts-getDashboardProjectData/home/user/projects/a",
    "readablePath": "~/projects/a",
    "tools": Array [
      "node",
      "npm",
    ],
  },
]
`

exports[`test/project-info.ts > TAP > getGraphProjectData > should return emtpy response on missing folder 1`] = `
Object {
  "tools": Array [],
  "vltInstalled": false,
}
`

exports[`test/project-info.ts > TAP > getGraphProjectData > should return the correct graph project data for a node+npm project 1`] = `
Object {
  "tools": Array [
    "node",
    "npm",
  ],
  "vltInstalled": false,
}
`

exports[`test/project-info.ts > TAP > getGraphProjectData > should return the correct graph project data for a non-installed vlt project 1`] = `
Object {
  "tools": Array [
    "vlt",
  ],
  "vltInstalled": false,
}
`

exports[`test/project-info.ts > TAP > getGraphProjectData > should return the correct graph project data for a vlt project 1`] = `
Object {
  "tools": Array [
    "vlt",
  ],
  "vltInstalled": true,
}
`

exports[`test/project-info.ts > TAP > getGraphProjectData empty vlt-installed project > should return vltInstalled: true for an empty but installed project 1`] = `
Object {
  "tools": Array [
    "vlt",
  ],
  "vltInstalled": true,
}
`
