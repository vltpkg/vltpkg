# @vltpkg/graph.lockfile

A library that stores `@vltpkg/graph.Graph` information into a lockfile and
reads information from stored lockfiles to rebuild a virtual `Graph`.

## USAGE

```
import { lockfile } from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'

const dir = 'path/to/my-project'
const packageJson = new PackageJson()
const mainManifest = await packageJson.read(dir)
const graph = lockfile.load({
  dir,
  mainManifest,
})

console.log(graph)
```
