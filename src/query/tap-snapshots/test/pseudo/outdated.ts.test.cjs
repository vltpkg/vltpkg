/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/outdated.ts > TAP > select from outdated definition > missing package response > should log a warning for missing package response 1`] = `
Array [
  Array [
    Error: Could not retrieve registry versions {
      "cause": Object {
        "cause": Error: Missing API {
          "attemptNumber": 1,
          "retriesLeft": 0,
        },
        "name": "c",
      },
    },
  ],
]
`

exports[`test/pseudo/outdated.ts > TAP > select from outdated definition > outdated as an element > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "c",
    "d",
    "e",
    "g",
    "e",
  ],
  "nodes": Array [
    "a",
    "c",
    "d",
    "e",
    "g",
    "e",
  ],
}
`

exports[`test/pseudo/outdated.ts > TAP > select from outdated definition > outdated kind any > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "c",
    "d",
    "e",
    "g",
    "e",
  ],
  "nodes": Array [
    "a",
    "c",
    "d",
    "e",
    "g",
    "e",
  ],
}
`

exports[`test/pseudo/outdated.ts > TAP > select from outdated definition > outdated kind in-range > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
    "e",
  ],
  "nodes": Array [
    "c",
    "e",
  ],
}
`

exports[`test/pseudo/outdated.ts > TAP > select from outdated definition > outdated kind major > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "c",
    "e",
    "e",
  ],
  "nodes": Array [
    "a",
    "c",
    "e",
    "e",
  ],
}
`

exports[`test/pseudo/outdated.ts > TAP > select from outdated definition > outdated kind minor > must match snapshot 1`] = `
Object {
  "edges": Array [
    "e",
  ],
  "nodes": Array [
    "e",
  ],
}
`

exports[`test/pseudo/outdated.ts > TAP > select from outdated definition > outdated kind out-of-range > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "d",
    "g",
    "e",
  ],
  "nodes": Array [
    "a",
    "d",
    "g",
    "e",
  ],
}
`

exports[`test/pseudo/outdated.ts > TAP > select from outdated definition > outdated kind patch > must match snapshot 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`
