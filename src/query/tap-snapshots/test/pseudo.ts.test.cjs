/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo.ts > TAP > pseudo > complex workspace > query > ":project" 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
    "b",
    "c",
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > complex workspace > query > ":root" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > cycle > query > ":attr([scripts])" 1`] = `
Object {
  "edges": Array [
    "a",
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > cycle > query > ":attr(scripts, [test=foo])" 1`] = `
Object {
  "edges": Array [
    "a",
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > cycle > query > ":empty" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > cycle > query > ":is([name=a])" 1`] = `
Object {
  "edges": Array [
    "a",
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > cycle > query > ":private" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > cycle > query > ":project" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "cycle-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > cycle > query > ":root" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "cycle-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > cycle > query > ":type(registry)" 1`] = `
Object {
  "edges": Array [
    "a",
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > missing manifest > query > ":attr([scripts])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > missing manifest > query > ":attr(scripts, [test=foo])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > missing manifest > query > ":is([name=a])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > missing node > query > ":has(.dev)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > missing node > query > ":missing" 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
  ],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > missing node > query > ":private" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([a])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([bolinha])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([keywords=missing])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([keywords=something])" 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([name])" 1`] = `
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

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([peerDependenciesMeta])" 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([scripts])" 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([scripts])" 2`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([scripts])" 3`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([scripts])" 4`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr([version^=1])" 1`] = `
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

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, [b])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, [e])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, [e=bar])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, [e=baz])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, [e=foo])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, b, [c])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, b, c, [d])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, b, c, [d=bar])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, b, c, [d=foo])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, e, [bar])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(a, e, [bolinha])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(contributors, [email=ruyadorno@example.com])" 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(contributors, [name^=Ruy])" 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(foo, bar, [baz])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(peerDependenciesMeta, [foo])" 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(peerDependenciesMeta, foo, [optional])" 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(peerDependenciesMeta, foo, [optional=true])" 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(scripts, [baz])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(scripts, [postinstall])" 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(scripts, [test=test])" 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":attr(scripts, bar, [baz])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":empty" 1`] = `
Object {
  "edges": Array [
    "@x/y",
    "a",
    "c",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "@x/y",
    "a",
    "c",
    "e",
    "f",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":empty" 2`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":empty" 3`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":empty" 4`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(:attr([scripts]))" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(:type(workspace))" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has([name=c], [name=f])" 1`] = `
Object {
  "edges": Array [
    "b",
    "d",
  ],
  "nodes": Array [
    "b",
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has([name=c], [name=f])" 2`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has([name=c], [name=f])" 3`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has([name=e])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(* [name=e])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(* > [name=e])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(* > * > [name=f])" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(*)" 1`] = `
Object {
  "edges": Array [
    "b",
    "d",
  ],
  "nodes": Array [
    "b",
    "d",
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(*)" 2`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(*[nonexistingattribute])" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(> *)" 1`] = `
Object {
  "edges": Array [
    "b",
    "d",
  ],
  "nodes": Array [
    "b",
    "d",
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(> *)" 2`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":has(~ :attr([peerDependenciesMeta]))" 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":is(:root)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":is(:root)" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":is([name=a], [name=b], [name=f])" 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
    "f",
  ],
  "nodes": Array [
    "a",
    "b",
    "f",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":is([name=a], [name=b], [name=f])" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":is(#foo, .asdf, [name===z], :root +, :nonexistingselector)" 1`] = `
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

exports[`test/pseudo.ts > TAP > pseudo > query > ":missing" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":not(:root)" 1`] = `
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
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":not(:root)" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":not([name=a], [name=b], [name=f])" 1`] = `
Object {
  "edges": Array [
    "@x/y",
    "c",
    "d",
    "e",
    "e",
  ],
  "nodes": Array [
    "@x/y",
    "c",
    "d",
    "e",
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":not([name=a], [name=b], [name=f])" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":private" 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":private" 2`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":private" 3`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":private" 4`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":project" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":project" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":project" 3`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":root" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":root" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":root" 3`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":scope" 1`] = `
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

exports[`test/pseudo.ts > TAP > pseudo > query > ":scope" 2`] = `
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

exports[`test/pseudo.ts > TAP > pseudo > query > ":scope" 3`] = `
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

exports[`test/pseudo.ts > TAP > pseudo > query > ":type(file)" 1`] = `
Object {
  "edges": Array [
    "@x/y",
  ],
  "nodes": Array [
    "@x/y",
    "my-project",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":type(git)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":type(registry)" 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
    "c",
    "d",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > query > ":type(registry)" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":empty" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":is(.workspace, :root)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":is(.workspace, :root)" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":is(.workspace)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":is(.workspace)" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":not(:root)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":not(:root)" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":not(.workspace, :root)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":not(.workspace)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":private" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":project" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":project" 2`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":project" 3`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":root" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":type(file)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "ws",
  ],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":type(registry)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo.ts > TAP > pseudo > workspace > query > ":type(workspace)" 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
  ],
}
`
