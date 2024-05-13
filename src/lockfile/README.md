# @vltpkg/lockfile

A library that stores `@vltpkg/graph.Graph` information into a lockfile and
reads information from stored lockfiles to rebuild a virtual `Graph`.

## API

### `load({ dir: string, packageInventory: @vltpkg/graph.PackageInventory }): Graph`

Loads a `Graph` from a lockfile at location `dir` using a `packageInventory`.

### `save({ dir: string, graph: @vltpkg/graph.Graph }): void`

Saves a `Graph` defined in the `graph` param to a lockfile that will be
located in directory `dir`.

## USAGE

```
import { PackageInventory } from '@vltpkg/graph'
import { load, save } from '@vltpkg/lockfile'

const graph = load({
    dir: 'path/to/lockfile/dir',
    packageInventory: new PackageInventory(),
})

console.log(graph)
```
