import t from 'tap'
import { stringifyNode } from '../src/stringify-node.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { type NodeLike } from '../src/types.ts'

const nodes = {
  ['undefined']: undefined,
  root: {
    id: joinDepIDTuple(['file', '.']),
    name: 'my-project',
    version: '1.0.0',
    mainImporter: true,
  } as NodeLike,
  reg: {
    id: joinDepIDTuple(['registry', '', 'dep@1.0.0']),
    name: 'dep',
    version: '1.0.0',
  } as NodeLike,
  customReg: {
    id: joinDepIDTuple(['registry', 'custom', 'dep@1.0.0']),
    name: 'dep',
    version: '1.0.0',
  } as NodeLike,
  git: {
    id: joinDepIDTuple(['git', 'github:a/b', '']),
    name: 'b',
    version: '1.0.0',
  } as NodeLike,
  file: {
    id: joinDepIDTuple(['file', 'path/to/file-dep']),
    name: 'file-dep',
    version: '1.0.0',
  } as NodeLike,
  versionless: {
    id: joinDepIDTuple(['file', 'path/to/file-dep']),
    name: 'file-dep',
  } as NodeLike,
  nameless: {
    id: joinDepIDTuple(['file', 'path/to/file-dep']),
    name: joinDepIDTuple(['file', 'path/to/file-dep']),
  } as NodeLike,
  remote: {
    id: joinDepIDTuple(['remote', 'http://example.com/a.tgz', '']),
    name: 'a',
    version: '1.0.0',
  } as NodeLike,
  workspace: {
    id: joinDepIDTuple(['workspace', 'my-workspace']),
    name: 'my-workspace',
    version: '1.0.0',
  } as NodeLike,
}

for (const [key, val] of Object.entries(nodes)) {
  t.matchSnapshot(
    stringifyNode(val as unknown as NodeLike),
    `should format ${key} node`,
  )
}
