import { unload } from '@vltpkg/vlt-json'
import { asWSConfig, Monorepo } from '@vltpkg/workspaces'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'

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
  }: { migrate?: boolean; loglevel?: string } = {},
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
    options: { projectRoot: dir, 'migrate-workspaces': migrate },
    values: { loglevel },
  } as unknown as LoadedConfig
  const vltJson = resolve(dir, 'vlt.json')
  return {
    dir,
    errs,
    migrate: () => mod.migrateWorkspaces(conf),
    warn: () => mod.warnIgnoredWorkspaces(conf),
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
