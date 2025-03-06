# @vltpkg/graph.lockfile

A library that stores `@vltpkg/graph.Graph` information into a
lockfile and reads information from stored lockfiles to rebuild a
virtual `Graph`.

## USAGE

```js
import { lockfile } from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'

const projectRoot = '/path/to/my-project'
const packageJson = new PackageJson()
const mainManifest = await packageJson.read(projectRoot)
const graph = lockfile.load({
  projectRoot,
  mainManifest,
})

console.log(graph)
```
