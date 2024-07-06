# @vltpkg/graph

This is the graph library responsible for representing the packages
that are involved in a given install.

## API

### `async buildIdeal({ projectRoot: string }): Promise<Graph>`

This method returns a new `Graph` object, reading from the `package.json`
file located at `projectRoot` dir and building up the graph representation
of nodes and edges from the files read from the local file system.

## USAGE

Here's a quick example of how to use the `buildIdeal` method that
builds a graph representation of the install defined at the current working
directory.

```
import { buildIdeal } from '@vltpkg/graph'

const graph = await buildIdeal({ projectRoot: process.cwd() })
```
