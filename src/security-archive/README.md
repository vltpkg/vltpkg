# @vltpkg/security-archive

A key/value storage that holds security data for unique package
versions that are coming from a public registry.

This package serves as the backend for `@vltpkg/query` when using
pseudo-selectors that rely on security data.

Security data is provided in partnership with
[Socket](https://socket.dev/).

## Usage

```
import { actual } from '@vltpkg/graph'
import { SecurityArchive } from '@vltpkg/security-archive'

const specOptions = {
  registry: 'https://registry.npmjs.org/',
}
const graph = actual.load({
  ...specOptions,
  projectRoot: process.cwd(),
})

const archive = await SecurityArchive.start({ graph, specOptions })

if (archive.ok) {
  for (const node of graph.nodes.values()) {
    const securityData = archive.get(node.id)
    if (securityData) {
      console.log('securityData', securityData)
    }
  }
} else {
  console.warn('Failed to start the SecurityArchive')
}
```
