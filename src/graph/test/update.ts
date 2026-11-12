import t from 'tap'
import type { Test } from 'tap'
import { PackageJson } from '@vltpkg/package-json'
import type { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import { objectLikeOutput } from '../src/visualization/object-like-output.ts'
import { mockPackageInfo as mockPackageInfoBase } from './fixtures/reify.ts'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { UpdateOptions } from '../src/update.ts'

const createMockPackageInfo = (
  overrides: Partial<typeof mockPackageInfoBase> = {},
) =>
  ({
    ...mockPackageInfoBase,
    ...overrides,
  }) as unknown as PackageInfoClient

const mockPackageInfo = createMockPackageInfo()

t.test('update', async t => {
  const options = {
    projectRoot: t.testdirName,
    scurry: {},
    packageJson: {
      read() {
        return { name: 'my-project', version: '1.0.0' }
      },
    },
  } as unknown as UpdateOptions
  let log = ''

  const { update } = await t.mockImport<
    typeof import('../src/update.ts')
  >('../src/update.ts', {
    '../src/ideal/build-ideal-from-starting-graph.ts': {
      buildIdealFromStartingGraph: async () => {
        log += 'build-ideal-from-starting-graph\n'
      },
    },
    '../src/actual/load.ts': {
      load: () => {
        log += 'actual.load\n'
      },
    },
    '../src/reify/index.ts': {
      reify: async () => {
        log += 'reify\n'
        return { buildQueue: [], diff: {} }
      },
    },
    '../src/modifiers.ts': {
      GraphModifier: {
        maybeLoad() {
          log += 'GraphModifier.maybeLoad\n'
        },
      },
    },
    '@vltpkg/workspaces': {
      Monorepo: { maybeLoad: () => undefined },
    },
  })

  await update(options)

  const expected =
    [
      'GraphModifier.maybeLoad',
      'build-ideal-from-starting-graph',
      'actual.load',
      'reify',
    ].join('\n') + '\n'
  t.equal(
    log,
    expected,
    'should call build-ideal-from-starting-graph -> actual.load -> reify in order',
  )
})

t.test(
  'update with no package.json file in cwd calls init',
  async t => {
    const dir = t.testdir({})
    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
    } as unknown as UpdateOptions

    let initCalled = false
    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      '@vltpkg/init': {
        init: async () => {
          initCalled = true
        },
      },
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
    })

    // Mock the second read after init
    let readCount = 0
    options.packageJson.read = () => {
      readCount++
      if (readCount === 1) {
        throw Object.assign(
          new Error('Could not read package.json file'),
          {
            code: 'ENOENT',
          },
        )
      }
      return { name: 'test', version: '1.0.0' }
    }

    await t.resolves(update(options), 'should succeed after init')
    t.ok(initCalled, 'should call init when package.json is missing')
  },
)

t.test('unknown error reading package.json', async t => {
  const dir = t.testdir({})
  const options = {
    projectRoot: dir,
    scurry: new PathScurry(),
    packageJson: {
      read() {
        throw new Error('ERR')
      },
    },
    packageInfo: mockPackageInfo,
  } as unknown as UpdateOptions
  const { update } = await t.mockImport<
    typeof import('../src/update.ts')
  >('../src/update.ts', {})

  await t.rejects(
    update(options),
    /ERR/,
    'should throw unknown errors',
  )
})

t.test(
  'update ignores expectLockfile and frozenLockfile flags',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      // No vlt-lock.json file on purpose
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
      frozenLockfile: true,
    } as unknown as UpdateOptions

    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
    })

    await t.resolves(
      update(options),
      'should not enforce lockfile on update',
    )
  },
)

t.test(
  'update uses package.json specs, ignoring existing node_modules and lockfile',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          // exact version present in fixtures to avoid network access
          'strip-ansi': '7.1.0',
        },
      }),
      // lockfile present but empty/outdated
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 1,
        options: {},
        nodes: {},
        edges: {},
      }),
      node_modules: {
        'strip-ansi': {
          'package.json': JSON.stringify({
            name: 'strip-ansi',
            version: '6.0.1',
          }),
        },
      },
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
    } as unknown as UpdateOptions

    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      // Avoid making any file system changes
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
    })

    const { graph } = await update(options)
    t.match(
      objectLikeOutput(graph),
      /Edge spec\(strip-ansi@7\.1\.0\)/,
      'ideal graph reflects package.json spec, not existing node_modules',
    )
  },
)

t.test(
  'update -w re-resolves only the selected workspaces',
  async t => {
    // exact specs (locked nodes) get that version, ranges get `latest`
    let latest = '1.0.0'
    const packageInfo = {
      async manifest({ final: f }: Spec) {
        return {
          name: f.name,
          version:
            /^\d+\.\d+\.\d+$/.test(f.bareSpec) ? f.bareSpec : latest,
        }
      },
      prefetchResolve: () => () => {},
    } as unknown as PackageInfoClient
    const pkg = (
      name: string,
      dependencies: Record<string, string>,
    ) => ({
      'package.json': JSON.stringify({
        name,
        version: '1.0.0',
        dependencies,
      }),
    })
    const dir = t.testdir({
      ...pkg('root', { a: '^1.0.0' }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        x: pkg('x', { b: '^1.0.0', d: '^1.0.0' }),
        y: pkg('y', { c: '^1.0.0', d: '^1.0.0' }),
      },
    })
    t.chdir(dir)
    unload('project')
    t.teardown(() => unload('project'))
    const packageJson = new PackageJson()
    // fresh scurry: fs changes between calls
    const opts = (load: { paths?: string[] } = {}) => {
      const scurry = new PathScurry(dir)
      return {
        projectRoot: dir,
        scurry,
        packageJson,
        packageInfo,
        registries: { npm: 'https://registry.npmjs.org/' },
        allowScripts: ':not(*)',
        monorepo: Monorepo.maybeLoad(dir, {
          scurry,
          packageJson,
          load,
        }),
      } as unknown as UpdateOptions
    }
    const { install } = await import('../src/install.ts')
    await install({ ...opts(), lockfileOnly: true })
    const lockfile = resolve(dir, 'vlt-lock.json')
    const lock = JSON.parse(readFileSync(lockfile, 'utf8')) as {
      nodes: Record<string, unknown>
    }

    latest = '1.1.0'
    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
    })
    const versions = async (options: UpdateOptions) => {
      const { graph } = await update(options)
      const res: Record<string, string | undefined> = {}
      for (const importer of graph.importers) {
        for (const edge of importer.edgesOut.values()) {
          res[`${importer.name} ${edge.name}`] = edge.to?.version
        }
      }
      return res
    }

    const scoped = {
      'root a': '1.0.0',
      'x b': '1.1.0',
      'x d': '1.0.0',
      'y c': '1.0.0',
      'y d': '1.0.0',
    }
    t.strictSame(
      await versions(opts({ paths: ['packages/x'] })),
      scoped,
      'only x re-resolved; shared d kept locked',
    )
    const all = {
      'root a': '1.1.0',
      'x b': '1.1.0',
      'x d': '1.1.0',
      'y c': '1.1.0',
      'y d': '1.1.0',
    }
    t.strictSame(
      await versions(opts()),
      all,
      'unfiltered updates all',
    )
    await t.rejects(
      update({ ...opts({ paths: ['packages/x'] }), target: '#b' }),
      { cause: { code: 'EUSAGE', found: '#b' } },
      'target and -w: usage error',
    )
    await t.rejects(
      update({ ...opts(), target: ':nope' }),
      { cause: { code: 'EUSAGE', found: ':nope' } },
      'invalid query: usage error',
    )
    writeFileSync(
      lockfile,
      JSON.stringify({
        ...lock,
        nodes: { ...lock.nodes, 'file~../../forbidden': [0, 'f'] },
      }),
    )
    await t.rejects(
      update(opts({ paths: ['packages/x'] })),
      { cause: { code: 'EINVALIDNAME' } },
      'unsafe lockfile fails loud',
    )
    rmSync(lockfile)
    t.strictSame(
      await versions(opts({ paths: ['packages/x'] })),
      all,
      'no lockfile, nothing installed: updates all',
    )

    // installed: root a, y c + d (store ids from the lockfile)
    const link = (from: string, name: string) => {
      const id = Object.keys(lock.nodes).find(i =>
        i.endsWith(`~${name}@1.0.0`),
      )!
      const pkgDir = resolve(
        dir,
        'node_modules/.vlt',
        id,
        'node_modules',
        name,
      )
      mkdirSync(pkgDir, { recursive: true })
      writeFileSync(
        resolve(pkgDir, 'package.json'),
        JSON.stringify({ name, version: '1.0.0' }),
      )
      mkdirSync(resolve(dir, from, 'node_modules'), {
        recursive: true,
      })
      symlinkSync(
        pkgDir,
        resolve(dir, from, 'node_modules', name),
        'junction',
      )
    }
    link('.', 'a')
    link('packages/y', 'c')
    link('packages/y', 'd')
    t.strictSame(
      await versions(opts({ paths: ['packages/x'] })),
      scoped,
      'no lockfile: unselected keep installed versions',
    )
  },
)

t.test('allowSkills', async t => {
  type LinkOpts = {
    target: string
    skillsDirs?: string[]
    graph: unknown
    apply?: boolean
  }
  // no `linkSkills`: loading the skills module throws
  const setup = async (
    t: Test,
    linkSkills?: (o: LinkOpts) => unknown,
    pj = true,
  ) => {
    const dir = t.testdir({
      ...(pj ?
        {
          'package.json': JSON.stringify({
            name: 'test',
            version: '1.0.0',
          }),
        }
      : {}),
      'vlt.json': '{}',
      node_modules: { '.vlt-lock.json': '{}' },
    })
    const graph = {
      nodes: new Map(),
      importers: [],
      projectRoot: dir,
    }
    const log: string[] = []
    const { update } = await t.mockImport<
      typeof import('../src/update.ts')
    >('../src/update.ts', {
      '../src/ideal/build-ideal-from-starting-graph.ts': {
        buildIdealFromStartingGraph: async () => {
          log.push('build')
          return graph
        },
      },
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: [], diff: {} }),
      },
      '../src/skills/index.ts': {
        get linkSkills() {
          if (!linkSkills) throw new Error('skills module loaded')
          return async (o: LinkOpts) => linkSkills(o)
        },
      },
      '@vltpkg/init': {
        init: async () => {
          log.push('init')
        },
      },
    })
    const run = (extra: Partial<UpdateOptions>) =>
      update({
        projectRoot: dir,
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        packageInfo: mockPackageInfo,
        allowScripts: ':not(*)',
        ...extra,
      })
    return { dir, graph, run, log }
  }

  t.test('links matching skills', async t => {
    const calls: LinkOpts[] = []
    const skills = {
      linked: [],
      unchanged: [],
      removed: [],
      conflicts: [],
    }
    const { graph, run } = await setup(t, o => {
      calls.push(o)
      return skills
    })
    const result = await run({
      allowSkills: '#foo:skill(x)',
      skillsDirs: ['.claude/skills'],
    })
    t.equal(calls.length, 1)
    t.equal(calls[0]?.target, '#foo:skill(x)')
    t.notOk(calls[0]?.apply, 'updates never apply')
    t.strictSame(calls[0]?.skillsDirs, ['.claude/skills'])
    t.equal(calls[0]?.graph, graph, 'uses the updated graph')
    t.equal(result.skills, skills)
  })

  t.test('unset or :not(*): skills module never loaded', async t => {
    const { run } = await setup(t)
    for (const extra of [
      {},
      { allowSkills: ':not(*)' },
      { skillsDirs: ['../x'] },
    ]) {
      t.notOk('skills' in (await run(extra)), JSON.stringify(extra))
    }
    await t.rejects(
      run({ allowSkills: '*' }),
      /skills module loaded/,
      'set: loaded',
    )
  })

  t.test('invalid query fails before updating', async t => {
    // no package.json: init would run first
    const { run, log } = await setup(t, undefined, false)
    for (const q of [':nope', '#foo:skill(x) > *']) {
      await t.rejects(run({ allowSkills: q }), {
        cause: { code: 'EUSAGE', found: q },
      })
    }
    t.strictSame(log, [], 'nothing built or initialized')
  })

  t.test('invalid skills-dir fails before updating', async t => {
    const { run, log } = await setup(t, undefined, false)
    await t.rejects(run({ allowSkills: '*', skillsDirs: ['../x'] }), {
      cause: { code: 'EUSAGE', found: '../x' },
    })
    t.strictSame(log, [], 'nothing built or initialized')
  })

  t.test('a link failure does not undo the update', async t => {
    const { dir, run } = await setup(t, () => {
      throw new Error('link failed')
    })
    await t.rejects(run({ allowSkills: '*' }), /link failed/)
    t.ok(
      statSync(resolve(dir, 'node_modules/.vlt-lock.json')).isFile(),
      'hidden lockfile kept',
    )
  })
})

t.test('update target re-resolves only matching deps', async t => {
  // highest published version in range, exact specs as given
  const avail: Record<string, string[]> = {
    a: ['1.0.0'],
    b: ['1.0.0'],
    '@s/c': ['1.0.0'],
    e: ['1.0.0', '2.0.0'],
  }
  const deps: Record<string, Record<string, string>> = {
    // `sc` aliases `@s/c`: one node, two edge names
    b: { '@s/c': '^1.0.0', e: '^1.0.0', sc: 'npm:@s/c@^1.0.0' },
  }
  const pick = (name: string, range: string) => {
    if (/^\d+\.\d+\.\d+$/.test(range)) return range
    const major = /^\^(\d+)\./.exec(range)?.[1]
    return avail[name]!.filter(
      v => !major || v.startsWith(`${major}.`),
    ).at(-1)
  }
  const packageInfo = {
    async manifest({ final: f }: Spec) {
      return {
        name: f.name,
        version: pick(f.name, f.bareSpec),
        dependencies: deps[f.name],
      }
    },
    prefetchResolve: () => () => {},
  } as unknown as PackageInfoClient
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'root',
      version: '1.0.0',
      dependencies: { a: '^1.0.0', b: '^1.0.0', e: '>=1' },
    }),
    'vlt.json': '{}',
  })
  t.chdir(dir)
  unload('project')
  t.teardown(() => unload('project'))
  const packageJson = new PackageJson()
  const opts = (target?: string) =>
    ({
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson,
      packageInfo,
      registries: { npm: 'https://registry.npmjs.org/' },
      allowScripts: ':not(*)',
      ...(target && { target }),
    }) as unknown as UpdateOptions
  const { install } = await import('../src/install.ts')
  await install({ ...opts(), lockfileOnly: true })

  for (const n of ['a', 'b', '@s/c']) avail[n]!.push('1.1.0')
  avail.e = ['1.0.0', '1.1.0', '2.0.0', '2.1.0']
  const { update } = await t.mockImport<
    typeof import('../src/update.ts')
  >('../src/update.ts', {
    '../src/reify/index.ts': {
      reify: async () => ({ buildQueue: [], diff: {} }),
    },
  })
  const versions = async (target?: string) => {
    const { graph } = await update(opts(target))
    t.equal(graph.unlockedEdges, undefined, 'unlocked edges reset')
    const res: Record<string, string | undefined> = {}
    for (const edge of graph.edges) {
      res[`${edge.from.name} ${edge.name}`] = edge.to?.version
    }
    return res
  }
  const locked = {
    'root a': '1.0.0',
    'root b': '1.0.0',
    'root e': '2.0.0',
    'b @s/c': '1.0.0',
    'b e': '1.0.0',
    'b sc': '1.0.0',
  }
  t.strictSame(await versions('#nope'), locked, 'no match: all kept')
  t.strictSame(
    await versions('#a'),
    { ...locked, 'root a': '1.1.0' },
    'direct dep',
  )
  for (const q of ['#@s/c', '#sc']) {
    t.strictSame(
      await versions(q),
      { ...locked, 'b @s/c': '1.1.0', 'b sc': '1.1.0' },
      `${q}: transitive dep, its dependent kept, alias too`,
    )
  }
  t.strictSame(
    await versions('#b'),
    { ...locked, 'root b': '1.1.0' },
    'its deps kept',
  )
  t.strictSame(
    await versions(':root > #e'),
    { ...locked, 'root e': '2.1.0' },
    'never reuses another locked copy',
  )
  t.strictSame(
    await versions('#e'),
    { ...locked, 'root e': '2.1.0', 'b e': '1.1.0' },
    'every copy',
  )
  // installed a: its manifest is what `[name=a]` reads
  const id = Object.keys(
    (
      JSON.parse(
        readFileSync(resolve(dir, 'vlt-lock.json'), 'utf8'),
      ) as { nodes: Record<string, unknown> }
    ).nodes,
  ).find(i => i.endsWith('~a@1.0.0'))!
  const pkgDir = resolve(
    dir,
    'node_modules/.vlt',
    id,
    'node_modules/a',
  )
  mkdirSync(pkgDir, { recursive: true })
  writeFileSync(
    resolve(pkgDir, 'package.json'),
    JSON.stringify({ name: 'a', version: '1.0.0' }),
  )
  symlinkSync(pkgDir, resolve(dir, 'node_modules/a'), 'junction')
  t.strictSame(
    await versions('[name=a]'),
    { ...locked, 'root a': '1.1.0' },
    'manifest selectors read installed manifests',
  )
  const all = {
    'root a': '1.1.0',
    'root b': '1.1.0',
    'root e': '2.1.0',
    'b @s/c': '1.1.0',
    'b e': '1.1.0',
    'b sc': '1.1.0',
  }
  t.strictSame(await versions('*'), all, 'every dep, importers kept')
  t.strictSame(await versions(), all, 'no target: all')
  // no lockfile: starts from the installed graph
  rmSync(resolve(dir, 'vlt-lock.json'))
  t.strictSame(
    await versions('#nope'),
    { ...all, 'root a': '1.0.0' },
    'no lockfile: installed kept',
  )
  t.strictSame(
    await versions('#a'),
    all,
    'no lockfile: selected updated',
  )
})

t.test('update target moves one git pin', async t => {
  // current commit of each repo's main branch
  const head: Record<string, string> = {
    g: 'a'.repeat(40),
    h: 'b'.repeat(40),
  }
  const packageInfo = {
    async manifest({ final: f }: Spec) {
      return {
        name: f.name,
        version: '1.0.0',
        dist: {
          tarball: `https://codeload.github.com/o/${f.name}/legacy.tar.gz/${head[f.name]}`,
        },
      }
    },
    prefetchResolve: () => () => {},
  } as unknown as PackageInfoClient
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'root',
      version: '1.0.0',
      dependencies: { g: 'github:o/g#main', h: 'github:o/h#main' },
    }),
    'vlt.json': '{}',
  })
  t.chdir(dir)
  unload('project')
  t.teardown(() => unload('project'))
  const opts = {
    projectRoot: dir,
    scurry: new PathScurry(dir),
    packageJson: new PackageJson(),
    packageInfo,
    allowScripts: ':not(*)',
  } as unknown as UpdateOptions
  const { install } = await import('../src/install.ts')
  await install({ ...opts, lockfileOnly: true })
  // both branches moved
  head.g = 'c'.repeat(40)
  head.h = 'd'.repeat(40)
  const { update } = await t.mockImport<
    typeof import('../src/update.ts')
  >('../src/update.ts', {
    '../src/reify/index.ts': {
      reify: async () => ({ buildQueue: [], diff: {} }),
    },
  })
  const { graph } = await update({ ...opts, target: '#g' })
  const pins = Object.fromEntries(
    [...graph.mainImporter.edgesOut.values()].map(e => [
      e.name,
      e.to?.resolved?.slice(-40),
    ]),
  )
  t.strictSame(
    pins,
    { g: 'c'.repeat(40), h: 'b'.repeat(40) },
    'only the selected pin moves',
  )
})
