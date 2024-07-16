# `@vltpkg/satisfies`

Give it a DepID and a Spec, and it'll tell you whether that dep
satisfies the spec.

Note that this method knows nothing about Nodes, Edges, or
dependency types, it's just doing simple string comparisons.

## USAGE

```js
import { Spec } from '@vltpkg/spec'
import { satisfies } from '@vltpkg/satisfies'
const id = ';;glob@11.0.1'
const spec = Spec.parse('foo@npm:glob@11.x')
console.log(satisfies(id, spec)) // true
```
