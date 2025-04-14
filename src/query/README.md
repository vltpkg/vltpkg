![query](https://github.com/user-attachments/assets/5b4802b7-7567-4f50-8f77-7ee398f58d43)

# @vltpkg/query

The **vlt** query engine implements a selector parser & search based on the [Dependency Selector Syntax](/cli/selectors).

## Usage

```js
import { Query } from '@vltpkg/query'

const query = new Query({ nodes, specOptions, securityArchive })
query.search(':root > *')
```

## Examples

Querying nodes from a local `node_modules` folder.

```js
import { actual } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'

const graph = await actual.load({ projectRoot: process.cwd() })
const query = new Query([...graph.nodes.values()])
query.search(':root > *')
```
