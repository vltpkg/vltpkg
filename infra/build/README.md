![build](https://github.com/user-attachments/assets/4ceaa394-8707-4bb3-935a-b29cd2c397ee)

# @vltpkg/infra-build

> An internal only workspace that is not published to any registry.

Utilized for building vlt.

## Usage

**Bundle and Compile**

```ts
import { bundle, compile } from '@vltpkg/infra-build'

const whichBinsToBundle = ['vlt'] as const
const bundleResult = await bundle({ outdir: './bundle', bins })

if (youWantToCompileAlso) {
  compileResult = await compile({
    source: bundleResult.outdir,
    outdir: './compile',
    bins,
  })
}
```

**Compile Only**

```ts
import { compile } from '@vltpkg/infra-build'

// This will also bundle to a temp dir and compile from that
const result = await compile({ outdir: './compile', bins })
```

**CLI**

```bash
vlt-build --outdir=bundle --bins=vlt bundle
vlt-build --outdir=compile --bins=vlt compile
```
