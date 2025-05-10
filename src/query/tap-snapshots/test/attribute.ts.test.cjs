/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/attribute.ts > TAP > attribute > missing node > query > "[name]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "node-missing-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > missing node > query > "[name=a]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[keywords=missing]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[keywords=something]" 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name]" 1`] = `
Object {
  "edges": Array [
    "@x/y",
    "a",
    "b",
    "c",
    "d",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "@x/y",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name*="pro"]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name*=pro]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name^="@x"]" 1`] = `
Object {
  "edges": Array [
    "@x/y",
  ],
  "nodes": Array [
    "@x/y",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name^="m"]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name^=@x]" 1`] = `
Object {
  "edges": Array [
    "@x/y",
  ],
  "nodes": Array [
    "@x/y",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name^=m]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name="@x/y"]" 1`] = `
Object {
  "edges": Array [
    "@x/y",
  ],
  "nodes": Array [
    "@x/y",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name="A" i]" 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name="A" s]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name="a"]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name="A"]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name="a"]" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name="b"]" 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name|="a"]" 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name|="my"]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name|=my]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name~="notfound"]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name~="project"]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name~=notfound]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name~=project]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name$="project"]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[name$=project]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[nonexistingattribute]" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/attribute.ts > TAP > attribute > query > "[version="1.0.0"]" 1`] = `
Object {
  "edges": Array [
    "@x/y",
    "a",
    "c",
    "d",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "@x/y",
    "a",
    "c",
    "d",
    "e",
    "f",
    "my-project",
  ],
}
`

exports[`test/attribute.ts > TAP > filterAttributes > should have filtered out nodes with postinstall script only 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`
