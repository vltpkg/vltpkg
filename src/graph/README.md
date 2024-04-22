# @vltpkg/graph

This is the graph library responsible for representing the packages
that are involved in a given install.

## API

### `async buildStarterGraph({ dir: string }): Promise<Graph>`

This method returns a new `Graph` object, reading from the `package.json`
file located at `dir` and building up the graph representation of nodes
and edges from the files read from the local file system.

### `Graph`

#### `inventory: Inventory`

The `inventory` property holds a map reference to all packages found
in the local file system. A `inventory.pending` property representing
packages which are not currently found in the local file system that
have metadata fetch from a registry, such as tarball / integrity info.

## USAGE

Here's a quick example of how to use the `buildStarterGraph` method that
builds a graph representation of the install defined at the current working
directory.

```
import { buildStarterGraph, Package } from '@vltpkg/graph'

const graph = await buildStarterGraph({ dir: process.cwd() })
const itemsToFetch: Set<Package> = graph.inventory.pending
```
