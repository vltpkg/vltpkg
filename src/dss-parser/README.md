# @vltpkg/dss-parser

The Dependency Selector Syntax parser used by the vlt client.

Uses
[postcss-selector-parser](https://github.com/postcss/postcss-selector-parser)
to parse a selector string into an AST.

## Usage

```js
import { parse } from '@vltpkg/dss-parser'

// Parse a selector string into an AST
const ast = parse(':root > *')
```

## Validation

`parse()` throws a `SyntaxError` on invalid DSS, with `cause.code`
`EQUERY` and the offending input in `cause.found`. Rejected:

- malformed syntax, e.g. `:outdated(`, `[name=`
- empty / whitespace-only queries and empty selectors (`#a,`,
  `:not()`)
- unknown pseudo-classes, combinators and attribute operators
- dangling combinators, e.g. `:root >`, `> >`
- bare words, strings, empty ids / attributes, e.g. `foo`, `.dev`,
  `"foo"`, `#`, `[]`

`:is()` arguments are a forgiving list: only the last group above is
rejected there.

Pass `{ loose: true }` to skip the DSS checks (malformed syntax still
throws):

```js
parse('#a, :unknown', { loose: true }) // no throw
```

Supported names are exported as `pseudoClassNames`, `combinatorNames`
and `attributeOperatorNames`.
