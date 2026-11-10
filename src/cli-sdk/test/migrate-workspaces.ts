import { joinDepIDTuple } from '@vltpkg/dep-id'
import type {
  AddImportersDependenciesMap,
  Dependency,
} from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { asWSConfig, Monorepo } from '@vltpkg/workspaces'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'
import type { MigratedSpec } from '../src/migrate-workspaces.ts'

const pkg = (name: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ name, version: '1.0.0', ...extra })

const npmRoot = {
  '.git': {},
  'package.json': pkg('root', {
    workspaces: ['packages/*', '!packages/skip'],
  }),
  packages: {
    a: { 'package.json': pkg('a') },
    b: { 'package.json': pkg('b') },
    skip: { 'package.json': pkg('skip') },
  },
}

const pnpmRoot = {
  '.git': {},
  'package.json': pkg('root'),
  'pnpm-workspace.yaml':
    "packages:\n  - 'packages/*'\n  - '!packages/skip'\n",
  packages: npmRoot.packages,
}

// fresh module tree (incl. vlt.json caches) per test
const setup = async (
  t: Test,
  tree: Parameters<Test['testdir']>[0],
  {
    migrate = true,
    loglevel = 'info',
    options = {},
    values = {},
  }: {
    migrate?: boolean
    loglevel?: string
    options?: Record<string, unknown>
    values?: Record<string, unknown>
  } = {},
) => {
  const dir = t.testdir(tree)
  t.chdir(dir)
  const errs: string[] = []
  const mod = await t.mockImport<
    typeof import('../src/migrate-workspaces.ts')
  >('../src/migrate-workspaces.ts', {
    '../src/output.ts': { stderr: (m: string) => errs.push(m) },
  })
  const conf = {
    options: {
      projectRoot: dir,
      'migrate-workspaces': migrate,
      packageJson: new PackageJson(),
      scurry: new PathScurry(dir),
      // unfiltered, as loaded by the config without --workspace
      get monorepo() {
        unload()
        return Monorepo.maybeLoad(dir)
      },
      ...options,
    },
    values: { loglevel, ...values },
  } as unknown as LoadedConfig
  const vltJson = resolve(dir, 'vlt.json')
  return {
    dir,
    errs,
    migrate: () => mod.migrateWorkspaces(conf),
    warn: () => mod.warnIgnoredWorkspaces(conf),
    find: () => mod.findWorkspaceSpecs(conf),
    addSpecs: (
      add: AddImportersDependenciesMap,
      specs: MigratedSpec[],
    ) => mod.addWorkspaceSpecs(add, specs, conf),
    read: () => readFileSync(vltJson, 'utf8'),
    exists: () => existsSync(vltJson),
  }
}

const names = (m?: Monorepo) => new Set(m?.names())

t.test('migrateWorkspaces', async t => {
  t.test('package.json, no vlt.json', async t => {
    const s = await setup(t, npmRoot)
    unload()
    const before = names(Monorepo.maybeLoad(s.dir))
    t.strictSame(before, new Set(['a', 'b']))
    t.strictSame(s.migrate(), {
      source: 'package.json',
      workspaces: ['packages/*', '!packages/skip'],
    })
    const saved = JSON.parse(s.read()) as { workspaces: string[] }
    t.strictSame(saved, {
      workspaces: ['packages/*', '!packages/skip'],
    })
    t.strictSame(
      names(
        Monorepo.load(s.dir, {
          config: asWSConfig(saved.workspaces),
        }),
      ),
      before,
      'same workspaces load',
    )
  })

  t.test('pnpm-workspace.yaml', async t => {
    const s = await setup(t, pnpmRoot)
    t.strictSame(s.migrate(), {
      source: 'pnpm-workspace.yaml',
      workspaces: ['packages/*', '!packages/skip'],
    })
    t.strictSame(JSON.parse(s.read()), {
      workspaces: ['packages/*', '!packages/skip'],
    })
  })

  t.test('vlt.json w/o workspaces keeps fields + format', async t => {
    const s = await setup(t, {
      ...npmRoot,
      'vlt.json':
        '{\n\t"config": {\n\t\t"registry": "http://x/"\n\t}\n}\n',
    })
    t.ok(s.migrate())
    const raw = s.read()
    t.strictSame(JSON.parse(raw), {
      config: { registry: 'http://x/' },
      workspaces: ['packages/*', '!packages/skip'],
    })
    t.match(raw, /^\{\n\t"config"/, 'tab indent kept')
    t.match(raw, /\}\n$/, 'trailing newline kept')
  })

  t.test('vlt.json workspaces never overwritten', async t => {
    const vltJson = JSON.stringify({ workspaces: ['packages/a'] })
    const s = await setup(t, { ...npmRoot, 'vlt.json': vltJson })
    t.equal(s.migrate(), undefined)
    t.equal(s.read(), vltJson)
  })

  t.test('single package: no vlt.json', async t => {
    const s = await setup(t, { '.git': {}, 'package.json': pkg('x') })
    t.equal(s.migrate(), undefined)
    t.notOk(s.exists())
  })

  t.test('empty workspaces: no vlt.json', async t => {
    const s = await setup(t, {
      '.git': {},
      'package.json': pkg('x', { workspaces: [] }),
    })
    t.equal(s.migrate(), undefined)
    t.notOk(s.exists())
  })

  t.test('--no-migrate-workspaces', async t => {
    const s = await setup(t, npmRoot, { migrate: false })
    t.equal(s.migrate(), undefined)
    t.notOk(s.exists())
  })
})

t.test('warnIgnoredWorkspaces', async t => {
  t.test('warns w/ source', async t => {
    const s = await setup(t, pnpmRoot)
    s.warn()
    t.strictSame(s.errs, [
      'Warning: vlt ci reads workspaces from vlt.json only; ignoring pnpm-workspace.yaml, its workspaces are not installed. Run `vlt install` to save them to vlt.json, or add them there.',
    ])
    t.notOk(s.exists(), 'nothing written')
  })

  for (const loglevel of ['silent', 'error']) {
    t.test(`quiet with loglevel=${loglevel}`, async t => {
      const s = await setup(t, npmRoot, { loglevel })
      s.warn()
      t.strictSame(s.errs, [])
    })
  }

  t.test('vlt.json workspaces: no warning', async t => {
    const s = await setup(t, {
      ...npmRoot,
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
    })
    s.warn()
    t.strictSame(s.errs, [])
  })

  t.test('invalid package.json workspaces: no throw', async t => {
    const s = await setup(t, {
      '.git': {},
      'package.json': pkg('root', {
        workspaces: { apps: ['apps/*'] },
      }),
    })
    s.warn()
    t.strictSame(s.errs, [])
  })
})

// workspaces referenced by plain ranges, the way npm and yarn v1 do
const refsRoot = {
  '.git': {},
  'package.json': pkg('root', {
    workspaces: ['packages/*'],
    devDependencies: { utils: '^1.0.0', abbrev: '^2.0.0' },
    // left for the install to report
    optionalDependencies: { other: 'nope:other' },
  }),
  packages: {
    utils: { 'package.json': pkg('utils', { version: '1.2.0' }) },
    other: { 'package.json': pkg('other') },
    nover: { 'package.json': JSON.stringify({ name: 'nover' }) },
    app: {
      'package.json': pkg('app', {
        dependencies: { utils: '1.x', lib: 'workspace:*' },
        optionalDependencies: { other: 'latest' },
      }),
    },
    lib: {
      'package.json': pkg('lib', {
        dependencies: {
          // not a workspace version: stays on the registry
          other: '^2.0.0',
          nover: '^1.0.0',
          alias: 'npm:utils@^1.0.0',
          linked: 'file:../utils',
        },
        // dev + peer: saving one would drop the other
        devDependencies: { utils: '^1.0.0' },
        peerDependencies: { utils: '^1.0.0' },
      }),
    },
  },
}

const rewritten: MigratedSpec[] = [
  {
    importer: '.',
    name: 'utils',
    type: 'devDependencies',
    from: '^1.0.0',
    to: 'workspace:*',
  },
  {
    importer: 'packages/app',
    name: 'utils',
    type: 'dependencies',
    from: '1.x',
    to: 'workspace:*',
  },
  {
    importer: 'packages/app',
    name: 'other',
    type: 'optionalDependencies',
    from: 'latest',
    to: 'workspace:*',
  },
]

const sorted = <T extends { importer: string; name: string }>(
  specs: T[],
) =>
  [...specs].sort((a, b) =>
    `${a.importer} ${a.name}`.localeCompare(
      `${b.importer} ${b.name}`,
    ),
  )

t.test('findWorkspaceSpecs', async t => {
  t.test(
    'plain ranges and dist-tags that link a workspace',
    async t => {
      const s = await setup(t, refsRoot)
      t.strictSame(sorted(s.find()), sorted(rewritten))
      t.strictSame(s.errs, [
        'Warning: other@^2.0.0 in packages/lib does not match workspace other (1.0.0), kept as is',
        'Warning: nover@^1.0.0 in packages/lib does not match workspace nover (no version), kept as is',
      ])
      t.notOk(s.exists(), 'vlt.json is saved by migrateWorkspaces')
    },
  )

  t.test('pnpm-workspace.yaml', async t => {
    const s = await setup(t, {
      ...refsRoot,
      'package.json': pkg('root'),
      'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n",
    })
    t.strictSame(sorted(s.find()), sorted(rewritten.slice(1)))
  })

  t.test('workspaces already in vlt.json', async t => {
    const s = await setup(t, {
      ...refsRoot,
      'package.json': pkg('root', {
        devDependencies: { utils: '^1.0.0' },
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
    })
    t.strictSame(sorted(s.find()), sorted(rewritten))
  })

  for (const flag of ['workspace', 'workspace-group']) {
    t.test(`whole project with --${flag}`, async t => {
      const s = await setup(t, refsRoot, {
        values: { [flag]: ['packages/lib'] },
        // filtered by the config
        options: { monorepo: undefined },
      })
      t.strictSame(sorted(s.find()), sorted(rewritten))
    })
  }

  t.test('edges a modifier removes or points elsewhere', async t => {
    const s = await setup(t, {
      ...refsRoot,
      'vlt.json': JSON.stringify({
        modifiers: {
          ':root > #utils': '-',
          // lib's stale ^2.0.0 too, so no warning for it
          ':project > #other': '2.0.0',
        },
      }),
    })
    t.strictSame(s.find(), [rewritten[1]])
    t.strictSame(s.errs, [
      'Warning: nover@^1.0.0 in packages/lib does not match workspace nover (no version), kept as is',
    ])
  })

  t.test(':project > :workspace pointing elsewhere', async t => {
    const s = await setup(t, {
      ...refsRoot,
      'vlt.json': JSON.stringify({
        modifiers: { ':project > :workspace': '2.0.0' },
      }),
    })
    t.strictSame(s.find(), [])
    t.strictSame(s.errs, [], "stale ranges are the modifier's too")
  })

  t.test(':project > :workspace linking workspaces', async t => {
    const s = await setup(t, {
      ...refsRoot,
      packages: {
        ...refsRoot.packages,
        // named after its folder, never linked by the modifier
        anon: { 'package.json': '{}' },
      },
      'vlt.json': JSON.stringify({
        modifiers: { ':project > :workspace': 'workspace:*' },
      }),
    })
    t.strictSame(sorted(s.find()), sorted(rewritten))
  })

  t.test('no warning with loglevel=error', async t => {
    const s = await setup(t, refsRoot, { loglevel: 'error' })
    t.equal(s.find().length, 3)
    t.strictSame(s.errs, [])
  })

  t.test('single package', async t => {
    const s = await setup(t, {
      '.git': {},
      'package.json': pkg('x', { dependencies: { x: '*' } }),
    })
    t.strictSame(s.find(), [])
  })

  for (const [name, opts] of [
    ['--no-migrate-workspaces', { migrate: false }],
    ['--frozen-lockfile', { options: { 'frozen-lockfile': true } }],
    ['--expect-lockfile', { options: { 'expect-lockfile': true } }],
  ] as const) {
    t.test(`not with ${name}`, async t => {
      const s = await setup(t, refsRoot, opts)
      t.strictSame(s.find(), [])
      t.strictSame(s.errs, [])
    })
  }
})

t.test('addWorkspaceSpecs', async t => {
  const s = await setup(t, refsRoot)
  const root = joinDepIDTuple(['file', '.'])
  const app = joinDepIDTuple(['workspace', 'packages/app'])
  // positionals: one map shared by the selected importers
  const explicit = new Map<string, Dependency>([
    ['utils', { spec: Spec.parse('utils', '^3.0.0'), type: 'prod' }],
  ])
  const add: AddImportersDependenciesMap = Object.assign(
    new Map([[app, explicit]]),
    { modifiedDependencies: false },
  )
  const lib: MigratedSpec = {
    importer: 'packages/app',
    name: 'lib',
    type: 'dependencies',
    from: '*',
    to: 'workspace:*',
  }
  const added = s.addSpecs(add, [...rewritten, lib])
  t.strictSame(
    added,
    [rewritten[0], rewritten[2], lib],
    'command line spec kept',
  )
  t.equal(add.modifiedDependencies, true)
  t.equal(explicit.size, 1, 'shared map left alone')
  t.strictSame(
    [...(add.get(app)?.keys() ?? [])],
    ['utils', 'other', 'lib'],
  )
  t.equal(add.get(app)?.get('utils')?.spec.bareSpec, '^3.0.0')
  const dep = add.get(root)?.get('utils')
  t.equal(dep?.spec.bareSpec, 'workspace:*')
  t.equal(dep?.type, 'dev')
  t.equal(add.get(app)?.get('other')?.type, 'optional')

  const empty: AddImportersDependenciesMap = Object.assign(
    new Map(),
    {
      modifiedDependencies: false,
    },
  )
  t.strictSame(s.addSpecs(empty, []), [])
  t.equal(empty.modifiedDependencies, false)
})
