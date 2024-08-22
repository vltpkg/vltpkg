# `@vltpkg/graph`

This is the graph library responsible for representing the packages
that are involved in a given install.

## API

### `actual.load({ projectRoot: string }): Graph`

Recursively loads the `node_modules` folder found at `projectRoot` in order to
create a graph representation of the current installed packages.

### `async ideal.build({ projectRoot: string }): Promise<Graph>`

This method returns a new `Graph` object, reading from the `package.json`
file located at `projectRoot` dir and building up the graph representation
of nodes and edges from the files read from the local file system.

### `lockfile.load({ mainManifest: Manifest, projectRoot: string }): Graph`

Loads the lockfile file found at `projectRoot` and returns the graph.

## USAGE

Here's a quick example of how to use the `@vltpkg/graph.ideal.build` method to
build a graph representation of the install defined at the `projectRoot`
directory.

```
import { ideal } from '@vltpkg/graph'

const graph = await ideal.build({ projectRoot: process.cwd() })
```
