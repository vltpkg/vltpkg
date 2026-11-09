import t from 'tap'
import type { Test } from 'tap'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import type { Graph, LockfileData } from '@vltpkg/graph'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { DeployResult } from '../../src/commands/deploy.ts'

type InstallOpts = Record<string, unknown>

let installed: InstallOpts[] = []
let installError: unknown
let buildQueue: string[] = []
let unloaded: string[] = []
// what Monorepo.maybeLoad returns for a source project, by its root.
// Other roots are deploy targets.
const projects = new Map<
  string,
  { values: () => unknown[] } | undefined
>()
t.beforeEach(() => {
  installed = []
  installError = undefined
  buildQueue = []
  unloaded = []
})

const graph = {
  nodes: { size: 5 },
  importers: { size: 2 },
} as unknown as Graph

const { command, usage, views } = await t.mockImport<
  typeof import('../../src/commands/deploy.ts')
>('../../src/commands/deploy.ts', {
  '@vltpkg/graph': {
    ...(await import('@vltpkg/graph')),
    install: async (opts: InstallOpts) => {
      installed.push(opts)
      if (installError) throw installError as Error
      return { graph, buildQueue }
    },
  },
  '@vltpkg/vlt-json': {
    unload: (which: string) => unloaded.push(which),
  },
  '@vltpkg/workspaces': {
    Monorepo: {
      maybeLoad: (root: string, opts: Record<string, unknown>) =>
        projects.has(root) ? projects.get(root) : { root, ...opts },
    },
  },
  '../../src/reload-config.ts': {
    reloadConfig: async (folder: string) => ({
      options: {
        projectRoot: folder,
        scurry: 'scurry',
        packageJson: 'packageJson',
      },
    }),
  },
})

type Workspace = {
  name?: string
  path: string
  fullpath: string
  id: string
  groups: string[]
}

const ws = (dir: string, path: string, groups = ['packages']) => ({
  name: path.split('/').pop(),
  path,
  fullpath: resolve(dir, path),
  id: `workspace~${path.replaceAll('/', '+')}`,
  groups,
})

const makeConf = ({
  dir,
  positionals,
  values = {},
  monorepo,
  allWorkspaces = monorepo,
  force,
}: {
  dir: string
  positionals: string[]
  values?: Record<string, unknown>
  /** conf.options.monorepo, filtered by -w in the real config */
  monorepo?: Workspace[]
  /** every workspace in the project */
  allWorkspaces?: Workspace[]
  force?: boolean
}) => {
  projects.set(
    dir,
    allWorkspaces ? { values: () => allWorkspaces } : undefined,
  )
  return {
    positionals,
    projectRoot: dir,
    options: {
      force,
      ...(monorepo ? { monorepo: { values: () => monorepo } } : {}),
    },
    get: (key: string) => values[key],
  } as unknown as LoadedConfig
}

const lockfile = (
  edges: LockfileData['edges'],
  options: LockfileData['options'] = {},
): string =>
  JSON.stringify({
    lockfileVersion: 1,
    options,
    nodes: {
      '~npm~ms@2.1.3': [0, 'ms'],
      '~npm~tap@21.0.0': [2, 'tap'],
    },
    edges,
  })

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>

const monorepoFixture = (t: Test) =>
  t.testdir({
    'package.json': JSON.stringify({ name: 'root' }),
    'vlt-lock.json': lockfile(
      {
        'file~_d tap': 'dev ^21 ~npm~tap@21.0.0',
        'workspace~apps+app lib':
          'prod workspace:* workspace~libs+lib',
        'workspace~apps+app ms': 'prod catalog: ~npm~ms@2.1.3',
        'workspace~apps+app tap': 'dev ^21 ~npm~tap@21.0.0',
        'workspace~libs+lib app':
          'peer workspace:* workspace~apps+app',
      },
      {
        catalog: { ms: '^2.1.3' },
        registry: 'https://registry.example/',
      },
    ),
    apps: {
      app: {
        'package.json': JSON.stringify({
          name: 'app',
          version: '1.0.0',
          files: ['src'],
          dependencies: { lib: 'workspace:*', ms: 'catalog:' },
          devDependencies: { tap: '^21' },
        }),
        src: { 'index.js': 'app' },
        'notes.txt': 'not in files',
      },
    },
    libs: {
      lib: {
        'package.json': JSON.stringify({
          name: 'lib',
          version: '0.1.0',
          peerDependencies: { app: 'workspace:*' },
          devDependencies: { tap: '^21' },
        }),
        'index.js': 'lib',
      },
    },
  })

t.test('usage', t => {
  t.matchSnapshot(usage().usage())
  t.end()
})

t.test('views', t => {
  const result: DeployResult = {
    path: '/out',
    name: 'app',
    version: '1.0.0',
    workspaces: ['lib', 'tool'],
    graph,
    buildQueue: ['~npm~esbuild@0.25.0'],
  }
  t.matchSnapshot(views.human(result), 'human')
  t.matchSnapshot(
    views.human({ path: '/out', workspaces: ['lib'], graph }),
    'human, one workspace, no name',
  )
  t.matchSnapshot(
    views.human({ path: '/out', workspaces: [], graph }),
    'human, no workspaces',
  )
  t.matchSnapshot(
    views.human({
      path: '/out',
      workspaces: [],
      graph,
      buildQueue: ['~npm~esbuild@0.25.0', '~npm~sharp@0.34.0'],
    }),
    'human, two packages to build',
  )
  t.strictSame(views.json(result), {
    path: '/out',
    name: 'app',
    version: '1.0.0',
    workspaces: ['lib', 'tool'],
    buildQueue: ['~npm~esbuild@0.25.0'],
    packages: 3,
  })
  t.end()
})

t.test('needs a target folder', async t => {
  const dir = t.testdir({})
  await t.rejects(command(makeConf({ dir, positionals: [] })), {
    message: 'Missing the deploy target folder',
    cause: { code: 'EUSAGE' },
  })
})

t.test('needs a lockfile', async t => {
  const dir = t.testdir({ 'package.json': '{}' })
  await t.rejects(command(makeConf({ dir, positionals: ['out'] })), {
    message: /run "vlt install" first/,
    cause: { code: 'ENOENT' },
  })
})

t.test('deploys a project without workspaces', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'single',
      version: '2.0.0',
      dependencies: { ms: '^2' },
      devDependencies: { tap: '^21' },
    }),
    'vlt-lock.json': lockfile({
      'file~_d ms': 'prod ^2 ~npm~ms@2.1.3',
      'file~_d tap': 'dev ^21 ~npm~tap@21.0.0',
    }),
    'index.js': 'single',
  })
  t.chdir(dir)
  // the target is inside the package, it is not copied into itself
  const result = await command(
    makeConf({ dir, positionals: ['dist/deploy'] }),
  )
  const out = resolve(dir, 'dist/deploy')
  t.equal(result.path, out)
  t.equal(result.name, 'single')
  t.equal(result.version, '2.0.0')
  t.strictSame(result.workspaces, [])
  t.equal(result.buildQueue, undefined)
  t.strictSame(readJson(resolve(out, 'package.json')), {
    name: 'single',
    version: '2.0.0',
    dependencies: { ms: '^2' },
  })
  t.equal(readFileSync(resolve(out, 'index.js'), 'utf8'), 'single')
  t.notOk(existsSync(resolve(out, 'dist/deploy')))
  t.strictSame(readJson(resolve(out, 'vlt.json')), { workspaces: [] })
  t.strictSame(readJson(resolve(out, 'vlt-lock.json')), {
    lockfileVersion: 1,
    options: {},
    nodes: { '~npm~ms@2.1.3': [0, 'ms'] },
    edges: { 'file~_d ms': 'prod ^2 ~npm~ms@2.1.3' },
  })
  t.match(installed, [
    {
      projectRoot: out,
      scurry: 'scurry',
      monorepo: {
        root: out,
        scurry: 'scurry',
        packageJson: 'packageJson',
      },
      allowScripts: ':not(*)',
      frozenLockfile: true,
      expectLockfile: true,
    },
  ])
  t.strictSame(unloaded, ['project'])
})

t.test('a package without name or version', async t => {
  const dir = t.testdir({
    'package.json': '{}',
    'vlt-lock.json': lockfile({}),
  })
  t.chdir(dir)
  buildQueue = ['~npm~esbuild@0.25.0']
  const result = await command(
    makeConf({ dir, positionals: ['out'] }),
  )
  t.equal(result.name, undefined)
  t.equal(result.version, undefined)
  t.strictSame(result.buildQueue, ['~npm~esbuild@0.25.0'])
})

t.test('deploys a workspace', async t => {
  const dir = monorepoFixture(t)
  t.chdir(dir)
  const monorepo = [ws(dir, 'apps/app'), ws(dir, 'libs/lib')]
  // a workspace without a name is listed by its path
  const libManifest = resolve(dir, 'libs/lib/package.json')
  const { name: _, ...noName } = readJson(libManifest)
  writeFileSync(libManifest, JSON.stringify(noName))
  const result = await command(
    makeConf({
      dir,
      positionals: ['out'],
      values: {
        workspace: ['apps/app'],
        'allow-scripts': '#esbuild',
      },
      monorepo,
    }),
  )
  const out = resolve(dir, 'out')
  t.strictSame(result.workspaces, ['libs/lib'], 'falls back to path')
  t.strictSame(readJson(resolve(out, 'package.json')), {
    name: 'app',
    version: '1.0.0',
    files: ['src'],
    dependencies: { lib: 'workspace:*', ms: 'catalog:' },
  })
  t.ok(existsSync(resolve(out, 'src/index.js')))
  t.notOk(existsSync(resolve(out, 'notes.txt')), 'follows files')
  t.strictSame(
    readJson(resolve(out, '.vlt-deploy/libs/lib/package.json')),
    {
      version: '0.1.0',
      peerDependencies: { app: 'file:../../..' },
    },
    'the cycle links back to the root',
  )
  t.ok(existsSync(resolve(out, '.vlt-deploy/libs/lib/index.js')))
  t.strictSame(readJson(resolve(out, 'vlt.json')), {
    workspaces: ['.vlt-deploy/libs/lib'],
    catalog: { ms: '^2.1.3' },
    config: {
      registry: 'https://registry.example/',
      'allow-scripts': '#esbuild',
    },
  })
  t.strictSame(readJson(resolve(out, 'vlt-lock.json')).edges, {
    'file~_d lib': 'prod workspace:* workspace~.vlt-deploy+libs+lib',
    'file~_d ms': 'prod catalog: ~npm~ms@2.1.3',
    'workspace~.vlt-deploy+libs+lib app':
      'peer file:../../.. file~_d',
  })
  t.match(installed, [{ allowScripts: '#esbuild' }])
})

t.test('lists copied workspaces by name', async t => {
  const dir = monorepoFixture(t)
  t.chdir(dir)
  const result = await command(
    makeConf({
      dir,
      positionals: ['out'],
      values: { workspace: ['apps/app'] },
      monorepo: [ws(dir, 'apps/app'), ws(dir, 'libs/lib')],
    }),
  )
  t.strictSame(result.workspaces, ['lib'])
})

t.test('choosing the workspace', async t => {
  const dir = monorepoFixture(t)
  t.chdir(dir)
  const monorepo = [
    ws(dir, 'apps/app', ['apps']),
    ws(dir, 'libs/lib', ['libs']),
  ]
  const run = (values: Record<string, unknown>) =>
    command(
      makeConf({
        dir,
        positionals: ['out'],
        values,
        monorepo,
        force: true,
      }),
    )

  await t.rejects(run({}), {
    message: 'Choose the workspace to deploy with --workspace',
    cause: { code: 'EUSAGE', validOptions: ['apps/app', 'libs/lib'] },
  })
  await t.rejects(run({ workspace: ['nope'] }), {
    message: 'Choose the workspace to deploy with --workspace',
  })
  await t.rejects(run({ workspace: ['*/*'] }), {
    message: 'vlt deploy can only deploy one workspace at a time',
    cause: { found: ['apps/app', 'libs/lib'] },
  })

  for (const values of [
    { workspace: ['app'] },
    { workspace: [resolve(dir, 'apps/app')] },
    { workspace: ['./apps/app'] },
    { 'workspace-group': ['apps'] },
  ]) {
    const result = await run(values)
    t.equal(result.name, 'app', JSON.stringify(values))
  }
})

t.test('the target folder', async t => {
  const dir = monorepoFixture(t)
  t.chdir(dir)
  const values = { workspace: ['apps/app'] }
  const run = (target: string, force?: boolean) =>
    command(
      makeConf({
        dir,
        positionals: [target],
        values,
        // like the real config with -w apps/app
        monorepo: [ws(dir, 'apps/app')],
        allWorkspaces: [ws(dir, 'apps/app'), ws(dir, 'libs/lib')],
        force,
      }),
    )

  await t.rejects(run('.', true), {
    message: 'The deploy target cannot contain project files',
    cause: { code: 'EUSAGE', found: dir },
  })
  // libs/lib is not selected with -w, but --force must not empty it
  await t.rejects(run('libs', true), {
    message: 'The deploy target cannot contain project files',
    cause: { found: resolve(dir, 'libs/lib') },
  })
  t.ok(
    existsSync(resolve(dir, 'libs/lib/package.json')),
    'the workspace is untouched',
  )

  writeFileSync(resolve(dir, 'a-file'), 'x')
  await t.rejects(run('a-file'), {
    message: 'The deploy target is not a folder',
    cause: { code: 'EUSAGE' },
  })

  const out = resolve(dir, 'out')
  await run('out')
  await t.rejects(run('out'), {
    message:
      'The deploy target is not empty. Use --force to replace its contents',
  })
  writeFileSync(resolve(out, 'stale'), 'x')
  await run('out', true)
  t.notOk(existsSync(resolve(out, 'stale')), 'force empties it')
  t.ok(existsSync(resolve(out, 'package.json')))
})

t.test('install failures', async t => {
  const dir = monorepoFixture(t)
  t.chdir(dir)
  const monorepo = [ws(dir, 'apps/app'), ws(dir, 'libs/lib')]
  const values = { workspace: ['apps/app'] }
  const run = (target: string, force?: boolean) =>
    command(
      makeConf({
        dir,
        positionals: [target],
        values,
        monorepo,
        force,
      }),
    )

  installError = new Error(
    'Lockfile is out of sync with package.json. Run "vlt install" to update.\n' +
      '  .: 1 dependency to add (abbrev)\n' +
      '  ./.vlt-deploy/libs/lib: 1 dependency to add (ms)',
  )
  await t.rejects(run('out'), {
    message:
      'vlt-lock.json is out of date, run "vlt install" in the project first.\n' +
      '  ./apps/app: 1 dependency to add (abbrev)\n' +
      '  ./libs/lib: 1 dependency to add (ms)',
    cause: { cause: installError },
  })
  t.notOk(
    existsSync(resolve(dir, 'out')),
    'created target is removed',
  )
  t.strictSame(unloaded, ['project'])

  installError = new Error('network down')
  const kept = resolve(dir, 'kept')
  mkdirSync(kept)
  writeFileSync(resolve(kept, 'stale'), 'x')
  await t.rejects(run('kept', true), { message: 'network down' })

  installError = 'not an error'
  await t.rejects(run('kept', true), 'not an error')
  t.ok(existsSync(kept), 'existing target is kept')
  t.notOk(existsSync(resolve(kept, 'package.json')), 'and emptied')
})

t.test('out of date project without workspaces', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({ dependencies: { ms: '^2' } }),
    'vlt-lock.json': lockfile({}),
  })
  t.chdir(dir)
  installError = new Error(
    'Lockfile is out of sync with package.json. Run "vlt install" to update.\n' +
      '  .: 1 dependency to add (ms)',
  )
  await t.rejects(command(makeConf({ dir, positionals: ['out'] })), {
    message:
      'vlt-lock.json is out of date, run "vlt install" in the project first.\n' +
      '  .: 1 dependency to add (ms)',
  })
})
