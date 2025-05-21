![query](https://github.com/user-attachments/assets/5b4802b7-7567-4f50-8f77-7ee398f58d43)

# @vltpkg/query

The **vlt** query syntax engine.

**[Usage](#usage)** · **[Examples](#examples)**

## Usage

```js
import { Query } from '@vltpkg/query'

const query = new Query({ nodes, specOptions, securityArchive })
const res = await query.search(':root > *')
```

## Examples

### Querying against an ideal/virtual graph

```js
import { ideal } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { PackageJson } from '@vltpkg/package-json'
const signal = new AbortController().signal
const projectRoot = process.cwd()
const packageJson = new PackageJson()
const graph = await ideal.build({ projectRoot, packageJson })
const query = new Query({ graph })
const res = await query.search(':root > *', { signal })
```

### Querying against a local `node_modules` folder

```js
import { actual } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
const signal = new AbortController().signal
const projectRoot = process.cwd()
const scurry = new PathScurry(projectRoot)
const packageJson = new PackageJson()
const graph = await actual.load({ projectRoot, packageJson, scurry })
const query = new Query({ graph })
const res = await query.search(':root > *', { signal })
```

### Querying against a lockfile

```js
import { lockfile } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
const signal = new AbortController().signal
const projectRoot = process.cwd()
const graph = await lockfile.load({
  mainManifest: 'package.json',
  projectRoot,
})
const query = new Query({ graph })
const res = await query.search(':root > *', { signal })
```
