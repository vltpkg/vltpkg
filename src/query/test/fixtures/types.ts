import { GraphSelectionState } from '../../src/types.js'

export type TestCase = [
  string, // query
  GraphSelectionState, // partial state nodes to start from
  string[], // list of expected result names
]
