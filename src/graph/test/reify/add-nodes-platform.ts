import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { Spec } from '@vltpkg/spec'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'

import { addNodes } from '../../src/reify/add-nodes.ts'

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

const inVltStoreTrue = () => true
const isOptionalTrue = () => true

const node = (props: Record<string, any>) => {
  const result = {
    resolvedLocation: (scurry: PathScurry) =>
      scurry.cwd.resolve(props.location).fullpath(),
    edgesIn: new Set(),
    ...props,
  }
  // Ensure the function is available on the object
  return result
}

t.test('platform data from lockfile', async t => {
  const diff = {
    to: {
      removeNode: () => {},
    },
    nodes: {
      delete: new Set<any>([]),
      add: new Set([
        // optional package with platform data from lockfile, should be filtered
        node({
          name: 'linux-only',
          id: joinDepIDTuple(['registry', '', 'linux-only@1.0.0']),
          location:
            './node_modules/.vlt/registry:linux-only@1.0.0/node_modules/linux-only',
          inVltStore: inVltStoreTrue,
          isOptional: isOptionalTrue,
          manifest: {
            name: 'linux-only',
            version: '1.0.0',
            dependencies: {},
          },
          // Platform data from lockfile
          platform: {
            os: 'linux',
            cpu: ['x64'],
          },
        }),
        // optional package with platform data that matches current platform
        node({
          name: 'cross-platform',
          id: joinDepIDTuple([
            'registry',
            '',
            'cross-platform@1.0.0',
          ]),
          location:
            './node_modules/.vlt/registry:cross-platform@1.0.0/node_modules/cross-platform',
          inVltStore: inVltStoreTrue,
          isOptional: isOptionalTrue,
          manifest: {
            name: 'cross-platform',
            version: '1.0.0',
            dependencies: {},
          },
          // Platform data from lockfile
          platform: {
            os: [process.platform, 'linux'],
            cpu: [process.arch, 'x64'],
          },
        }),
        // optional package with no platform data (should be extracted)
        node({
          name: 'any-platform',
          id: joinDepIDTuple(['registry', '', 'any-platform@1.0.0']),
          location:
            './node_modules/.vlt/registry:any-platform@1.0.0/node_modules/any-platform',
          inVltStore: inVltStoreTrue,
          isOptional: isOptionalTrue,
          manifest: {
            name: 'any-platform',
            version: '1.0.0',
            dependencies: {},
          },
        }),
      ]),
      edges: {
        add: new Set(),
        delete: new Set(),
      },
    },
    hadOptionalFailures: false,
  } as unknown as Diff

  const scurry = new PathScurry()
  const options = {}

  // Reset tracking arrays
  removed.length = 0
  extracted.length = 0

  const actions = addNodes(
    diff,
    scurry,
    mockRemover,
    options,
    mockPackageInfo,
  )
  await Promise.all(actions.map(a => a()))

  // If not on Linux, linux-only package should have been filtered out
  if (process.platform !== 'linux') {
    t.notOk(
      extracted.find(([spec]) => spec.name === 'linux-only'),
      'linux-only package was not extracted on non-Linux platform',
    )
    t.ok(
      [...diff.nodes.delete].some(
        n =>
          n.id ===
          joinDepIDTuple(['registry', '', 'linux-only@1.0.0']),
      ),
      'linux-only package was removed from diff',
    )
  }

  // cross-platform should always be extracted since it supports current platform
  t.ok(
    extracted.find(([spec]) => spec.name === 'cross-platform'),
    'cross-platform package was extracted',
  )

  // any-platform should be extracted since it has no platform restrictions
  t.ok(
    extracted.find(([spec]) => spec.name === 'any-platform'),
    'any-platform package was extracted',
  )
})

t.test('deprecated packages with platform data', async t => {
  const diff = {
    to: {
      removeNode: () => {},
    },
    nodes: {
      delete: new Set<any>([]),
      add: new Set([
        // deprecated optional package should be filtered regardless of platform
        node({
          name: 'deprecated-pkg',
          id: joinDepIDTuple([
            'registry',
            '',
            'deprecated-pkg@1.0.0',
          ]),
          location:
            './node_modules/.vlt/registry:deprecated-pkg@1.0.0/node_modules/deprecated-pkg',
          inVltStore: inVltStoreTrue,
          isOptional: isOptionalTrue,
          manifest: {
            name: 'deprecated-pkg',
            version: '1.0.0',
            deprecated: 'This package is deprecated',
            dependencies: {},
          },
          platform: {
            os: [process.platform],
            cpu: [process.arch],
          },
        }),
      ]),
      edges: {
        add: new Set(),
        delete: new Set(),
      },
    },
    hadOptionalFailures: false,
  } as unknown as Diff

  const scurry = new PathScurry()
  const options = {}

  // Reset tracking arrays
  removed.length = 0
  extracted.length = 0

  const actions = addNodes(
    diff,
    scurry,
    mockRemover,
    options,
    mockPackageInfo,
  )
  await Promise.all(actions.map(a => a()))

  t.notOk(
    extracted.find(([spec]) => spec.name === 'deprecated-pkg'),
    'deprecated package was not extracted',
  )
  t.ok(
    [...diff.nodes.delete].some(
      n =>
        n.id ===
        joinDepIDTuple(['registry', '', 'deprecated-pkg@1.0.0']),
    ),
    'deprecated package was removed from diff',
  )
})
