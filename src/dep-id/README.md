<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/f5e3adcc-3179-43dd-9f40-21c957fa4e55" />
        <h1 align="center">
            <strong>@vltpkg/dep-id</strong>
        </h1>
    </a>
</section>

<p align="center">
    A library for serializing dependencies into terse string
    identifiers, and turning those serialized identifiers back into
    `Spec` objects.
</p>

<p align="center">
  <a href="#usage"><strong>Usage</strong></a>
	·
  <a href="#note"><strong>Note</strong></a>
</p>

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
