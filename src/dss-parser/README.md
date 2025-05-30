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
