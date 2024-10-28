![dep-id](https://github.com/user-attachments/assets/f44cb9f8-e778-447c-8100-9ff564427048)

# @vltpkg/dep-id

A library for serializing dependencies into terse string identifiers, and turning those serialized identifiers back into `Spec` objects.

**[Usage](#usage)**
·
**[Note](#note)**

## Usage

```js
import {
  getId,
  getTuple,
  hydrate,
  hydrateTuple,
  joinDepIDTuple,
  splitDepID,
} from '@vltpkg/dep-id'
import { manifest } from '@vltpkg/package-info'

{
  // default registry
  const spec = Spec.parse('x@latest')
  const mani = await manifest(spec)
  const id = getId(spec, mani) // registry;;x@1.2.3
}

{
  // not default registry
  const spec = Spec.parse('x@vlt:y@latest', {
    registries: { vlt: 'http://vlt.sh' },
  })
  const mani = await manifest(spec)
  const id = getId(spec, mani) // registry;vlt;y@latest
}

{
  // git, hosted
  const spec = Spec.parse('x@github:a/b#branch')
  const mani = await manifest(spec)
  const id = getId(spec, mani) // git;github:a/b;branch
}

// Hydrate by providing a name, and options for the spec creation
const spec = hydrate('git;github:a/b;branch', 'x') // x@github:a/b#branch
```

### Note

multiple different spec/manifest combinations _can_ result
in the same identifier. For example, the specifiers
`x@npm:y@latest` and `asdf@npm:y@1.x` might both ultimately
resolve to the same package, so they only need to appear in the
store once.
