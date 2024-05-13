# @vltpkg/graph.lockfile

A library that stores `@vltpkg/graph.Graph` information into a lockfile and
reads information from stored lockfiles to rebuild a virtual `Graph`.

## API

### `load({ graph: Graph, mainManifest: @vltpkg/types.ManifestMinified }, config: @vltpkg/config.ConfigFileData): Graph`

Loads a `Graph` from a lockfile at location `dir` using a `packageInventory`.

### `save({ dir: string, graph: Graph }, config: @vltpkg/config.ConfigFileData): void`

Saves a `Graph` defined in the `graph` param to a lockfile that will be
located in directory `dir`.

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
