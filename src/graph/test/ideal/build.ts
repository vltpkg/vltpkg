import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { getOptions, Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { asDependency } from '../../src/dependencies.ts'
import { build } from '../../src/ideal/build.ts'
import { LOCKFILE_VERSION } from '../../src/lockfile/types.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import type { DepIDTuple } from '@vltpkg/dep-id'
import type { Manifest } from '@vltpkg/types'
import type { LockfileEdgeKey } from '../../src/index.ts'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../../src/dependencies.ts'

const edgeKey = (from: DepIDTuple, to: string): LockfileEdgeKey =>
  `${joinDepIDTuple(from)} ${to}`

const specOptions = getOptions({})

const packageInfo = {
  async manifest(spec: Spec) {
    switch (spec.name) {
      case 'foo':
        return {
          name: 'foo',
          version: '1.0.0',
          dist: {
            integrity:
              'sha512-URO90jLnKPqX+P7OLnJkiIQfMX4I6gEdGZ1T84drQLtRPw6uNKYLZfB6K3hjWIrj0VZB1kh2cTFdeq01i6XIYQ==',
          } as Manifest,
        }
      default:
        throw new Error('404 - ' + spec.name, { cause: { spec } })
    }
  },
} as PackageInfoClient

t.test('build from lockfile', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }),
    'vlt-lock.json': JSON.stringify({
      options: {},
      nodes: {
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
          0,
          'foo',
          'sha512-URO90jLnKPqX+P7OLnJkiIQfMX4I6gEdGZ1T84drQLtRPw6uNKYLZfB6K3hjWIrj0VZB1kh2cTFdeq01i6XIYQ==',
        ],
      },
      edges: {
        [edgeKey(['file', '.'], 'foo')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      },
    }),
  })

  const graph = await build({
    ...specOptions,
    scurry: new PathScurry(projectRoot),
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    packageInfo,
    projectRoot,
    add: new Map([
      [joinDepIDTuple(['file', '.']), new Map()],
    ]) as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(
    objectLikeOutput(graph),
    'should build an ideal tree starting from a virtual graph',
  )
})

t.test('build from actual files', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }),
    node_modules: {
      '.vlt': {
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: {
          node_modules: {
            foo: {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '1.0.0',
              }),
            },
          },
        },
      },
      foo: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']) +
          '/node_modules/foo',
      ),
    },
  })

  const graph = await build({
    ...specOptions,
    scurry: new PathScurry(projectRoot),
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    packageInfo,
    projectRoot,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(
    objectLikeOutput(graph),
    'should build an ideal tree starting from a virtual graph',
  )
})

t.test('add with file DepID not in graph throws', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      options: {},
      nodes: {},
      edges: {},
    }),
  })

  await t.rejects(
    build({
      ...specOptions,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      add: new Map([
        [
          joinDepIDTuple(['file', 'packages/unknown']),
          new Map([
            [
              'foo',
              asDependency({
                spec: Spec.parse('foo@^1.0.0'),
                type: 'prod',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
      remove: new Map() as RemoveImportersDependenciesMap,
      remover: new RollbackRemove(),
    }),
    {
      message:
        'The current working dir is not a dependency of this project',
    },
  )
})

t.test('remove with file DepID not in graph throws', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      options: {},
      nodes: {},
      edges: {},
    }),
  })

  await t.rejects(
    build({
      ...specOptions,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      add: new Map() as AddImportersDependenciesMap,
      remove: new Map([
        [
          joinDepIDTuple(['file', 'packages/unknown']),
          new Set(['foo']),
        ],
      ]) as RemoveImportersDependenciesMap,
      remover: new RollbackRemove(),
    }),
    {
      message:
        'The current working dir is not a dependency of this project',
    },
  )
})

t.test(
  'aliased and non-aliased npm deps resolve to same node',
  async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
          bar: 'npm:foo@^1.0.0',
        },
      }),
    })

    // Use final.name to resolve aliased specs correctly
    const aliasAwarePackageInfo = {
      async manifest(spec: Spec) {
        switch (spec.final.name) {
          case 'foo':
            return {
              name: 'foo',
              version: '1.0.0',
              dist: {
                integrity:
                  'sha512-URO90jLnKPqX+P7OLnJkiIQfMX4I6gEdGZ1T84drQLtRPw6uNKYLZfB6K3hjWIrj0VZB1kh2cTFdeq01i6XIYQ==',
              } as Manifest,
            }
          default:
            throw new Error('404 - ' + spec.final.name, {
              cause: { spec },
            })
        }
      },
    } as PackageInfoClient

    const graph = await build({
      ...specOptions,
      // the `npm` alias is no longer built in; configure it so the
      // `npm:foo` alias resolves
      registries: {
        ...specOptions.registries,
        npm: 'https://registry.npmjs.org/',
      },
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo: aliasAwarePackageInfo,
      projectRoot,
      remover: new RollbackRemove(),
    })

    // Both foo and bar should resolve to the same DepID node
    const fooEdge = graph.mainImporter.edgesOut.get('foo')
    const barEdge = graph.mainImporter.edgesOut.get('bar')

    t.ok(fooEdge?.to, 'foo edge should have a target node')
    t.ok(barEdge?.to, 'bar edge should have a target node')
    t.equal(
      fooEdge?.to?.id,
      barEdge?.to?.id,
      'both deps should resolve to the same node (same DepID)',
    )
    t.equal(
      graph.nodes.size,
      2,
      'graph should have exactly 2 nodes (root + foo)',
    )
  },
)

t.test('lockfile version handling', async t => {
  const { LOCKFILE_VERSION } = await t.mockImport<
    typeof import('../../src/lockfile/types.ts')
  >('../../src/lockfile/types.ts')

  t.test('newer lockfile version throws error', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: LOCKFILE_VERSION + 1,
        options: {},
        nodes: {},
        edges: {},
      }),
    })

    await t.rejects(
      build({
        ...specOptions,
        scurry: new PathScurry(projectRoot),
        monorepo: Monorepo.maybeLoad(projectRoot),
        packageJson: new PackageJson(),
        packageInfo,
        projectRoot,
        remover: new RollbackRemove(),
      }),
      {
        message: 'Unsupported lockfile version',
        cause: {
          code: 'ELOCKFILEVERSION',
          found: LOCKFILE_VERSION + 1,
          wanted: LOCKFILE_VERSION,
        },
      },
      'newer lockfile version should throw',
    )
  })

  t.test('older lockfile version throws', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: LOCKFILE_VERSION - 1,
        options: {},
        nodes: {},
        edges: {},
      }),
      node_modules: {
        foo: {
          'package.json': JSON.stringify({
            name: 'foo',
            version: '1.0.0',
          }),
        },
        '.vlt': {
          'vlt.json': JSON.stringify({}),
        },
      },
    })

    await t.rejects(
      build({
        ...specOptions,
        scurry: new PathScurry(projectRoot),
        monorepo: Monorepo.maybeLoad(projectRoot),
        packageJson: new PackageJson(),
        packageInfo,
        projectRoot,
        remover: new RollbackRemove(),
      }),
      {
        message: 'Unsupported lockfile version',
        cause: {
          code: 'ELOCKFILEVERSION',
          found: LOCKFILE_VERSION - 1,
          wanted: LOCKFILE_VERSION,
        },
      },
      'newer lockfile version should throw',
    )
  })
})

t.test('broken lockfile fails loud, does not rebuild', async t => {
  const { LOCKFILE_VERSION } = await t.mockImport<
    typeof import('../../src/lockfile/types.ts')
  >('../../src/lockfile/types.ts')
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: { foo: '^1.0.0' },
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: LOCKFILE_VERSION,
      options: {},
      nodes: {
        [`file~../../../tmp/forbidden`]: [0, 'forbidden'],
      },
      edges: {},
    }),
  })

  await t.rejects(
    build({
      ...specOptions,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      remover: new RollbackRemove(),
    }),
    { cause: { code: 'EINVALIDNAME' } },
    'does not silently fall back to loading the actual tree',
  )
})

t.test(
  'releases the server resolve once the ideal graph is built',
  async t => {
    const calls: string[] = []
    const resolving = {
      manifest: (spec: Spec) => packageInfo.manifest(spec),
      prefetchResolve: () => {
        calls.push('prefetch')
        return () => calls.push('release')
      },
    } as unknown as PackageInfoClient
    const options = {
      ...specOptions,
      registry: 'https://registry.npmjs.org/',
      registries: {
        ...specOptions.registries,
        npm: 'https://registry.npmjs.org/',
      },
      packageJson: new PackageJson(),
      packageInfo: resolving,
      remove: new Map() as RemoveImportersDependenciesMap,
      remover: new RollbackRemove(),
    }
    const project = (dependencies: Record<string, string>) => {
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
          dependencies,
        }),
      })
      return {
        ...options,
        projectRoot,
        scurry: new PathScurry(projectRoot),
        monorepo: Monorepo.maybeLoad(projectRoot),
        add: new Map([
          [joinDepIDTuple(['file', '.']), new Map()],
        ]) as AddImportersDependenciesMap,
      }
    }

    await build(project({ foo: '^1.0.0' }))
    t.strictSame(
      calls,
      ['prefetch', 'release'],
      'released after the build',
    )
  },
)

t.test('git rows locked to a ref are re-pinned', async t => {
  const sha = 'a'.repeat(40)
  const sha2 = 'b'.repeat(40)
  const fooId = joinDepIDTuple(['registry', '', 'foo@1.0.0'])
  const rId = joinDepIDTuple(['git', 'github:o/r', 'main'])
  const tId = joinDepIDTuple([
    'git',
    'git+https://host/t.git',
    'main',
  ])
  const shaId = joinDepIDTuple(['git', 'github:o/r', sha])
  const archive = 'https://codeload.github.com/o/r/legacy.tar.gz/'
  const fooInt = 'sha512-foo'
  const calls: string[] = []
  const packageInfo = {
    async manifest(spec: Spec) {
      calls.push(spec.name)
      switch (spec.name) {
        case 'foo':
          return {
            name: 'foo',
            version: '1.0.0',
            dependencies: { t: 'git+https://host/t.git#main' },
            dist: { integrity: fooInt },
          }
        case 'r':
          return {
            name: 'r',
            version: '2.0.0',
            dist: {
              tarball: archive + sha2,
              integrity: 'sha512-new',
            },
          }
        default:
          return {
            name: 't',
            version: '2.0.0',
            dist: { tarball: `git+https://host/t.git#${sha2}` },
          }
      }
    },
  } as unknown as PackageInfoClient
  // r: importer dep, t: only reached through foo
  const project = (
    r: [string, string] | undefined,
    tRes: string,
    more: Record<string, unknown> = {},
  ) => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
          ...(r && { r: 'github:o/r#main' }),
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: LOCKFILE_VERSION,
        options: {},
        nodes: {
          [fooId]: [0, 'foo', fooInt],
          ...(r && { [rId]: [0, 'r', ...r] }),
          [tId]: [0, 't', null, tRes],
          ...more,
        },
        edges: {
          [edgeKey(['file', '.'], 'foo')]: `prod ^1.0.0 ${fooId}`,
          ...(r && {
            [edgeKey(['file', '.'], 'r')]:
              `prod github:o/r#main ${rId}`,
          }),
          [`${fooId} t`]: `prod git+https://host/t.git#main ${tId}`,
        },
      }),
    })
    return {
      ...specOptions,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      remover: new RollbackRemove(),
    }
  }
  const legacy = () =>
    project(['sha512-old', 'github:o/r'], 'git+https://host/t.git')

  const graph = await build(legacy())
  const r = graph.nodes.get(rId)
  t.equal(r?.resolved, archive + sha2, 'hosted row pinned')
  t.equal(r?.integrity, 'sha512-new', 'with the pinned bytes')
  t.equal(r?.version, '2.0.0', 'new version')
  t.equal(
    graph.nodes.get(fooId)?.edgesOut.get('t')?.to?.resolved,
    `git+https://host/t.git#${sha2}`,
    'transitive clone row pinned',
  )
  t.equal(graph.nodes.get(fooId)?.integrity, fooInt, 'registry kept')
  t.equal(graph.lockfileStale, true, 'lockfile gets written')
  t.strictSame(
    calls.filter(n => n !== 'foo').sort(),
    ['r', 't'],
    're-resolved once each',
  )

  for (const flag of ['frozenLockfile', 'expectLockfile']) {
    calls.length = 0
    const g = await build({ ...legacy(), [flag]: true })
    t.equal(
      g.nodes.get(rId)?.resolved,
      'github:o/r',
      `${flag}: as is`,
    )
    t.equal(
      g.nodes.get(rId)?.integrity,
      'sha512-old',
      `${flag}: integrity`,
    )
    t.equal(
      g.nodes.get(tId)?.resolved,
      'git+https://host/t.git',
      `${flag}: clone row`,
    )
    t.equal(g.lockfileStale, false, `${flag}: not stale`)
    t.strictSame(calls, [], `${flag}: nothing resolved`)
  }

  // pinned rows, or a ref that is a sha: no change, nothing fetched
  calls.length = 0
  const pinned = project(
    ['sha512-x', archive + sha],
    `git+https://host/t.git#${sha}`,
    { [shaId]: [0, 'r', 'sha512-y', 'github:o/r'] },
  )
  const g = await build(pinned)
  t.equal(g.nodes.get(rId)?.resolved, archive + sha)
  t.equal(g.nodes.get(tId)?.resolved, `git+https://host/t.git#${sha}`)
  t.equal(g.lockfileStale, false, 'pinned: no write')
  t.strictSame(calls, [], 'pinned: nothing resolved')

  // a row only reached through a registry dep
  const deep = await build(
    project(undefined, 'git+https://host/t.git'),
  )
  t.equal(
    deep.nodes.get(fooId)?.edgesOut.get('t')?.to?.resolved,
    `git+https://host/t.git#${sha2}`,
    'transitive only: pinned',
  )
})

t.test('a git row that fails to re-pin is kept as is', async t => {
  const warn = t.capture(console, 'error')
  const sha = 'b'.repeat(40)
  const rId = joinDepIDTuple(['git', 'github:o/r', 'main'])
  const tId = joinDepIDTuple([
    'git',
    'git+https://host/t.git',
    'main',
  ])
  const er = new Error('host down')
  let rFails = true
  const calls: string[] = []
  const packageInfo = {
    async manifest(spec: Spec) {
      calls.push(spec.name)
      if (spec.name === 'n' || (spec.name === 'r' && rFails)) throw er
      return spec.name === 'r' ?
          {
            name: 'r',
            version: '2.0.0',
            dist: {
              tarball: `https://codeload.github.com/o/r/legacy.tar.gz/${sha}`,
              integrity: 'sha512-new',
            },
          }
        : {
            name: 't',
            version: '2.0.0',
            dist: { tarball: `git+https://host/t.git#${sha}` },
          }
    },
  } as unknown as PackageInfoClient
  // r: legacy row, its manifest known once installed; t: legacy row;
  // n: optional, not locked
  const project = ({
    optional = false,
    more = false,
    installed = true,
  }) => {
    const type = optional ? 'optional' : 'prod'
    const flags = optional ? 1 : 0
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        [optional ? 'optionalDependencies' : 'dependencies']: {
          r: 'github:o/r#main',
          ...(more && { t: 'git+https://host/t.git#main' }),
          ...(more && optional && { n: 'github:o/n#main' }),
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: LOCKFILE_VERSION,
        options: {},
        nodes: {
          [rId]: [
            flags,
            'r',
            'sha512-old',
            'github:o/r',
            ...(installed ?
              [null, { name: 'r', version: '1.0.0' }]
            : []),
          ],
          ...(more && {
            [tId]: [flags, 't', null, 'git+https://host/t.git'],
          }),
        },
        edges: {
          [edgeKey(['file', '.'], 'r')]:
            `${type} github:o/r#main ${rId}`,
          ...(more && {
            [edgeKey(['file', '.'], 't')]:
              `${type} git+https://host/t.git#main ${tId}`,
          }),
        },
      }),
    })
    return {
      ...specOptions,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      remover: new RollbackRemove(),
    }
  }

  const g = await build(project({}))
  t.equal(g.nodes.get(rId)?.resolved, 'github:o/r', 'kept')
  t.equal(g.nodes.get(rId)?.integrity, 'sha512-old', 'kept integrity')
  t.equal(g.lockfileStale, false, 'nothing to write')
  t.strictSame(calls, ['r'], 'tried once')
  const w = warn()
  t.equal(w.length, 1, 'one warning')
  t.match(w[0]?.args, [/^warning: r@github:o\/r#main: .*host down/])

  calls.length = 0
  const o = await build(project({ optional: true, more: true }))
  t.equal(o.nodes.get(rId)?.resolved, 'github:o/r', 'optional: kept')
  t.equal(
    o.nodes.get(tId)?.resolved,
    `git+https://host/t.git#${sha}`,
    'other row pinned',
  )
  t.notOk(o.nodesByName.has('n'), 'other optional deps skipped')
  t.equal(warn().length, 1, 'one warning')
  t.equal(calls.filter(n => n === 't').length, 1, 'fetched once')

  // the rebuild would fetch r again
  const c = await build(project({ more: true, installed: false }))
  t.equal(
    c.nodes.get(rId)?.resolved,
    'github:o/r',
    'not installed: kept',
  )
  t.equal(
    c.nodes.get(tId)?.resolved,
    'git+https://host/t.git',
    'not installed: others pinned later',
  )
  t.equal(c.lockfileStale, false, 'not installed: nothing to write')
  warn()

  rFails = false
  calls.length = 0
  const p = await build(project({}))
  t.equal(
    p.nodes.get(rId)?.integrity,
    'sha512-new',
    'host back: pinned',
  )
  t.strictSame(calls, ['r'], 'fetched once')
})

t.test('a kept row under a re-pinned one is reused', async t => {
  const warn = t.capture(console, 'error')
  const sha = 'b'.repeat(40)
  const rId = joinDepIDTuple(['git', 'github:o/r', 'main'])
  const tId = joinDepIDTuple([
    'git',
    'git+https://host/t.git',
    'main',
  ])
  const tSpec = 'git+https://host/t.git#main'
  const calls: string[] = []
  const packageInfo = {
    async manifest(spec: Spec) {
      calls.push(spec.name)
      if (spec.name === 't') throw new Error('ref gone')
      return {
        name: 'r',
        version: '2.0.0',
        dependencies: { t: tSpec },
        dist: {
          tarball: `https://codeload.github.com/o/r/legacy.tar.gz/${sha}`,
          integrity: 'sha512-new',
        },
      }
    },
  } as unknown as PackageInfoClient
  // r: legacy row, re-pins; t: its legacy child, ref gone, installed
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: { r: 'github:o/r#main' },
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: LOCKFILE_VERSION,
      options: {},
      nodes: {
        [rId]: [0, 'r', 'sha512-old', 'github:o/r'],
        [tId]: [
          0,
          't',
          null,
          'git+https://host/t.git',
          null,
          { name: 't', version: '1.0.0' },
        ],
      },
      edges: {
        [edgeKey(['file', '.'], 'r')]: `prod github:o/r#main ${rId}`,
        [`${rId} t`]: `prod ${tSpec} ${tId}`,
      },
    }),
  })
  const g = await build({
    ...specOptions,
    scurry: new PathScurry(projectRoot),
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    packageInfo,
    projectRoot,
    remover: new RollbackRemove(),
  })
  t.equal(g.nodes.get(rId)?.integrity, 'sha512-new', 'r pinned')
  t.equal(
    g.nodes.get(rId)?.edgesOut.get('t')?.to?.resolved,
    'git+https://host/t.git',
    'its child kept',
  )
  t.strictSame(calls.sort(), ['r', 't'], 'probes only')
  t.equal(warn().length, 1, 'one warning')
})

t.test('a re-pin path-safety error is never kept', async t => {
  const rId = joinDepIDTuple(['git', 'github:o/r', 'main'])
  const packageInfo = {
    async manifest() {
      throw new Error('bad name', { cause: { code: 'EINVALIDNAME' } })
    },
  } as unknown as PackageInfoClient
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: { r: 'github:o/r#main' },
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: LOCKFILE_VERSION,
      options: {},
      nodes: { [rId]: [0, 'r', 'sha512-old', 'github:o/r'] },
      edges: {
        [edgeKey(['file', '.'], 'r')]: `prod github:o/r#main ${rId}`,
      },
    }),
  })
  await t.rejects(
    build({
      ...specOptions,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      remover: new RollbackRemove(),
    }),
    { message: 'bad name' },
  )
})
