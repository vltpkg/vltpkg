![build](https://github.com/user-attachments/assets/4ceaa394-8707-4bb3-935a-b29cd2c397ee)

# @vltpkg/infra-build

> An internal only workspace that is not published to any registry.

Utilized for building vlt.

## Usage

**Bundle**

```ts
import { bundle } from '@vltpkg/infra-build'

const whichBinsToBundle = ['vlt'] as const
const bundleResult = await bundle({ outdir: './bundle', bins })
```

**CLI**

```bash
vlt-build --outdir=bundle --bins=vlt bundle
```

**Standalone executable (experimental)**

Requires Bun 1.4 or later. From this workspace:

```bash
node src/compile.ts ../../.build-bun/vlt
```

The executable embeds the bundle, assets, and background helpers. Node
and Bun are only needed when package scripts require them. Additional
arguments are passed to `bun build`, for example
`--target=bun-linux-x64`. Target platforms still need runtime testing.
