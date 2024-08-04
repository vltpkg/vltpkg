import { PackageInfoClient } from '@vltpkg/package-info'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { resolve } from 'path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Diff } from '../../src/diff.js'

import { addNodes } from '../../src/reify/add-nodes.js'

const removed: string[] = []
const mockRemover = {
  rm: async (path: string) => removed.push(path),
} as unknown as RollbackRemove

const extracted: [Spec, string][] = []
const mockPackageInfo = {
  extract: async (spec: Spec, target: string) => {
    extracted.push([spec, target])
  },
} as unknown as PackageInfoClient

const inVltStoreFalse = () => false
const inVltStoreTrue = () => true

const diff = {
  nodes: {
    add: new Set([
      // not in vlt store
      { name: 'name', inVltStore: inVltStoreFalse },
      // this one gets added
      {
        id: ';;foo@1.2.3',
        inVltStore: inVltStoreTrue,
        location: './node_modules/.vlt/;;foo@1.2.3/node_modules/foo',
        name: 'foo',
      },
      // this one too, but has a manifest
      {
        id: ';;bar@1.2.3',
        inVltStore: inVltStoreTrue,
        location: './node_modules/.vlt/;;bar@1.2.3/node_modules/bar',
        name: 'bar',
        manifest: { name: 'bar', version: '1.2.3' },
      },
    ]),
  },
} as unknown as Diff

const scurry = new PathScurry(t.testdirName)

await Promise.all(
  addNodes(diff, scurry, mockRemover, {}, mockPackageInfo),
)

t.strictSame(removed, [
  resolve(
    t.testdirName,
    'node_modules/.vlt/;;foo@1.2.3/node_modules/foo',
  ),
  resolve(
    t.testdirName,
    'node_modules/.vlt/;;bar@1.2.3/node_modules/bar',
  ),
])

t.strictSame(extracted, [
  [
    Spec.parse('foo@1.2.3'),
    resolve(
      t.testdirName,
      'node_modules/.vlt/;;foo@1.2.3/node_modules/foo',
    ),
  ],
  [
    Spec.parse('bar@1.2.3'),
    resolve(
      t.testdirName,
      'node_modules/.vlt/;;bar@1.2.3/node_modules/bar',
    ),
  ],
])
