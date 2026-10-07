import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

// real clients in tests never use the user's cache; created only if written
export const clientCache = resolve(
  tmpdir(),
  `vlt-graph-test-${process.pid}`,
)
