import { NodeLike } from '@vltpkg/graph'

export type TestCase = [
  string, // query
  NodeLike[], // partial state nodes to start from
  string[], // list of expected result names
]
