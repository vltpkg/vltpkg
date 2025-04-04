import { Spec } from '@vltpkg/spec'
import t from 'tap'
import type { Edge } from '../src/edge.ts'
import type { Node } from '../src/node.ts'
import { resolveSaveType } from '../src/resolve-save-type.ts'

const node = {
  edgesOut: new Map(),
} as unknown as Node

const fooEdge = {
  type: 'dev',
  from: node,
  spec: Spec.parse('foo@1.2.3'),
} as unknown as Edge

node.edgesOut.set('foo', fooEdge)

t.equal(
  resolveSaveType(node, 'foo', 'implicit'),
  'dev',
  'preserved if found',
)
t.equal(
  resolveSaveType(node, 'bar', 'implicit'),
  'prod',
  'prod if not found',
)
t.equal(
  resolveSaveType(node, 'foo', 'optional'),
  'optional',
  'respected if not implicit',
)
