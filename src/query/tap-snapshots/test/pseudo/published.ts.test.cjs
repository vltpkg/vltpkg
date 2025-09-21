/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/published.ts > TAP > pseudo state form - :published without parameters > should match packages with published metadata (registry packages) 1`] = `
Object {
  "edges": Array [
    "file·.->··a@1.0.0",
    "file·.->··b@1.0.0",
    "file·.->··e@1.0.0",
    "··b@1.0.0->··c@1.0.0",
    "··d@1.0.0->··e@1.0.0",
    "··d@1.0.0->··f@1.0.0",
  ],
  "nodes": Array [
    "··a@1.0.0",
    "··b@1.0.0",
    "··c@1.0.0",
    "··e@1.0.0",
    "··f@1.0.0",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published exact date > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published exact time (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published exact time > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published greater than date (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
    "d",
    "e",
  ],
  "nodes": Array [
    "c",
    "d",
    "e",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published greater than date (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
    "d",
    "e",
  ],
  "nodes": Array [
    "c",
    "d",
    "e",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published greater than or equal date (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
    "c",
    "d",
    "e",
  ],
  "nodes": Array [
    "b",
    "c",
    "d",
    "e",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published greater than or equal date (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
    "c",
    "d",
    "e",
  ],
  "nodes": Array [
    "b",
    "c",
    "d",
    "e",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published less than date (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published less than date (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published less than or equal date (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
  ],
}
`

exports[`test/pseudo/published.ts > TAP > select from published definition > published less than or equal date (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
  ],
}
`
