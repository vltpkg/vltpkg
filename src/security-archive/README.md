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

const archive = await SecurityArchive.start({
  nodes: [...graph.nodes.values()],
})

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

## Options

- `path`: sqlite db location. Defaults to the vlt XDG cache dir.
- `retries`: retry attempts on failed API requests. Defaults to `3`.
- `timeout`: max ms to wait for the API, retries included. Defaults to
  `VLT_SECURITY_ARCHIVE_TIMEOUT` env or `30000`. Must be a positive
  integer, other values are ignored. On timeout a warning is printed,
  missing packages stay unscanned, `ok` is `false`, `timedOut` is
  `true` and nothing is cached.
- `ttl`: ms to cache newly fetched entries for. Defaults to 3 hours.
