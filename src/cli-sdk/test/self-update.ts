import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { Spec } from '@vltpkg/spec'
import * as cp from 'node:child_process'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import type { RmOptions } from 'node:fs'
import * as fsp from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'
import type { Self } from '../src/global-bin-dir.ts'
import type { GlobalBins } from '../src/global.ts'
import type { InstallReceipt } from '../src/install-receipt.ts'
import type { FetchRelease, SelfUpdate } from '../src/self-update.ts'
import { prettyPath } from '../src/shell.ts'

const real = (p: string) => realpathSync.native(p)
const id = (v: string) => joinDepIDTuple(['registry', '', `vlt@${v}`])
const sha = (s: string) =>
  `sha512-${createHash('sha512').update(s).digest('base64')}`
const eacces = () =>
  Object.assign(new Error('denied'), { code: 'EACCES' })

type Opts = {
  self?: Self
  which?: (cmd: string) => string | null
  fsp?: Record<string, unknown>
  close?: number | null | Error
  receiptFails?: boolean
}

const load = async (t: Test, o: Opts = {}) => {
  let findSelfCalls = 0
  const whichCalls: string[] = []
  const spawned: { cmd: string; args: string[]; opts: unknown }[] = []
  const receipts: [string, unknown][] = []
  const mod = await t.mockImport<
    typeof import('../src/self-update.ts')
  >('../src/self-update.ts', {
    '../src/global-bin-dir.ts': {
      findSelf: async () => {
        findSelfCalls++
        return o.self
      },
    },
    '@vltpkg/which': {
      which: async (cmd: string) => {
        whichCalls.push(cmd)
        return o.which ? o.which(cmd) : null
      },
    },
    'node:child_process': t.createMock(cp, {
      spawn: (cmd: string, args: string[], opts: unknown) => {
        spawned.push({ cmd, args, opts })
        const child = new EventEmitter()
        setImmediate(() => {
          const { close = 0 } = o
          if (close instanceof Error) child.emit('error', close)
          else child.emit('close', close)
        })
        return child
      },
    }),
    'package-json-from-dist': {
      loadPackageJson: () => ({ version: '1.2.3' }),
    },
    '../src/install-receipt.ts': {
      writeInstallReceipt: async (file: string, u: unknown) => {
        receipts.push([file, u])
        if (o.receiptFails) throw new Error('bad receipt')
      },
    },
    'node:fs/promises': t.createMock(fsp, o.fsp ?? {}),
  })
  return {
    ...mod,
    spawned,
    receipts,
    whichCalls,
    findSelfCalls: () => findSelfCalls,
  }
}

const manifestCalls: string[] = []
const conf = (
  globalRoot: string | undefined,
  positionals: string[],
  m: { name?: string; version?: string } = {
    name: 'vlt',
    version: '1.3.0',
  },
) =>
  ({
    command: 'install',
    globalRoot,
    projectRoot: globalRoot,
    positionals,
    options: {
      tag: 'latest',
      packageInfo: {
        manifest: async (spec: Spec) => {
          manifestCalls.push(String(spec))
          return m
        },
      },
    },
  }) as unknown as LoadedConfig

const receiptOf = (
  binDir: string,
  data: Partial<InstallReceipt['data']> = {},
): InstallReceipt => ({
  file: join(binDir, 'install-receipt.json'),
  data: { receiptVersion: 1, method: 'npm', binDir, ...data },
})

// npm -g layout, node with its bundled npm, a global root
const fixture = (
  t: Test,
  { sibling = true, bundled = false } = {},
) => {
  const npm = () => ({ bin: { 'npm-cli.js': '' } })
  const root = t.testdir({
    prefix: {
      bin: { vlt: '' },
      lib: {
        node_modules: {
          vlt: { 'vlt.js': '' },
          ...(sibling ? { npm: npm() } : {}),
        },
      },
    },
    node: {
      bin: { node: '' },
      lib: { node_modules: bundled ? { npm: npm() } : {} },
    },
    npmlink: {
      npm: npm(),
      bin: { npm: t.fixture('symlink', '../npm/bin/npm-cli.js') },
    },
    // no lib/ above node_modules
    noLib: { node_modules: { vlt: { 'vlt.js': '' } } },
    checkout: { 'vlt.js': '' },
    ws: { packages: { 'vlt-global-ws': { 'package.json': '{}' } } },
    g: {
      bin: {},
      node_modules: {
        '.vlt': {
          [id('1.2.3')]: { node_modules: { vlt: { 'vlt.js': '' } } },
        },
      },
    },
    other: { 'npm-cli.js': '', npm: '' },
  })
  const prefix = join(root, 'prefix')
  const g = join(root, 'g')
  const self: Self = {
    found: join(prefix, 'bin', 'vlt'),
    dir: real(join(prefix, 'bin')),
    target: real(join(prefix, 'lib/node_modules/vlt/vlt.js')),
    standalone: false,
  }
  return {
    root,
    g,
    prefix: real(prefix),
    self,
    npmCli: join(real(prefix), 'lib/node_modules/npm/bin/npm-cli.js'),
  }
}

const linux = (t: Test) =>
  t.intercept(process, 'platform', { value: 'linux' })

const { exitCode } = process
t.beforeEach(() => {
  manifestCalls.length = 0
})
t.afterEach(() => {
  process.exitCode = exitCode
})

// exit 1, nothing thrown
const refused = (t: Test, res: unknown, message: string | RegExp) => {
  t.match(res, {
    done: { status: 'refused', from: '1.2.3', message },
  })
  t.equal(process.exitCode, 1)
  process.exitCode = exitCode
}

const installerLine =
  'Re-run the installer to update vlt:\n  curl -fsSL https://install.vlt.sh | bash'

t.test('not a self-update', async t => {
  const { g, self } = fixture(t)
  const mod = await load(t, { self })
  t.equal(await mod.selfUpdate(conf(undefined, ['vlt'])), undefined)
  t.equal(await mod.selfUpdate(conf(g, [])), undefined)
  t.equal(await mod.selfUpdate(conf(g, ['eslint'])), undefined)
  t.equal(mod.findSelfCalls(), 0)
  await t.rejects(mod.selfUpdate(conf(g, ['vlt', 'eslint'])), {
    message: 'Update vlt on its own, without other packages',
    cause: { code: 'EUSAGE', found: 'vlt eslint' },
  })
})

t.test('not run from the PATH', async t => {
  const mod = await load(t)
  t.intercept(process, 'argv', { value: ['node', '/x/vlt.js'] })
  await t.rejects(mod.selfUpdate(conf('/g', ['vlt'])), {
    message: `Can't tell which vlt to update: run the vlt on your PATH, not /x/vlt.js`,
    cause: { code: 'EUSAGE' },
  })
  t.intercept(process, 'argv', { value: ['node'] })
  await t.rejects(mod.selfUpdate(conf('/g', ['vlt'])), {
    message: `Can't tell which vlt to update: run the vlt on your PATH, not ${process.execPath}`,
  })
})

t.test('classify', async t => {
  t.test('receipt npm + npm: npm, receipt rewritten', async t => {
    linux(t)
    const { g, self, npmCli, prefix } = fixture(t)
    const receipt = receiptOf(self.dir)
    const mod = await load(t, { self: { ...self, receipt } })
    const res = await mod.selfUpdate(conf(g, ['vlt']))
    t.match(res, { done: { case: 'npm', status: 'updated' } })
    t.strictSame(mod.spawned[0]?.args, [
      npmCli,
      'install',
      '--global',
      '--prefix',
      prefix,
      'vlt@1.3.0',
    ])
    t.strictSame(mod.receipts, [[receipt.file, { version: '1.3.0' }]])
  })

  t.test('receipt npm, no npm: installer line', async t => {
    linux(t)
    const { g, self, root } = fixture(t, { sibling: false })
    t.intercept(process, 'execPath', {
      value: join(root, 'node/bin/node'),
    })
    const receipt = receiptOf(self.dir)
    const mod = await load(t, { self: { ...self, receipt } })
    const res = await mod.selfUpdate(conf(g, ['vlt']))
    refused(t, res, installerLine)
    t.match(res, { done: { dir: self.dir } })
    t.equal(mod.spawned.length, 0)
  })

  t.test('unknown receipt method: installer line', async t => {
    const { g, self } = fixture(t)
    const receipt = receiptOf(self.dir, { method: 'brew' })
    const mod = await load(t, { self: { ...self, receipt } })
    refused(t, await mod.selfUpdate(conf(g, ['vlt'])), installerLine)
    t.equal(mod.spawned.length, 0)
    t.strictSame(mod.receipts, [])
  })

  t.test('homebrew', async t => {
    const { g, self, root } = fixture(t)
    t.intercept(process, 'env', {
      value: { ...process.env, HOMEBREW_CELLAR: real(root) },
    })
    const mod = await load(t, { self })
    refused(
      t,
      await mod.selfUpdate(conf(g, ['vlt'])),
      `vlt at ${prettyPath(self.dir)} was installed by Homebrew. Run \`brew upgrade vlt\`.`,
    )
    t.equal(mod.spawned.length, 0)

    const env = { ...process.env }
    delete env.HOMEBREW_CELLAR
    t.intercept(process, 'env', { value: env })
    const brew: Self = {
      ...self,
      // a node formula: npm's layout inside the cellar
      target:
        '/opt/homebrew/Cellar/vlt/1/libexec/lib/node_modules/vlt/vlt.js',
    }
    const mod2 = await load(t, { self: brew })
    refused(t, await mod2.selfUpdate(conf(g, ['vlt'])), /Homebrew/)
  })

  t.test('standalone without receipt', async t => {
    const { g, self } = fixture(t)
    const mod = await load(t, { self: { ...self, standalone: true } })
    refused(
      t,
      await mod.selfUpdate(conf(g, ['vlt'])),
      `vlt at ${prettyPath(self.dir)} is not managed by vlt or npm. Update it the way you installed it.`,
    )
  })

  t.test('receipt outlived its vlt', async t => {
    linux(t)
    const { g, self } = fixture(t)
    // standalone receipt, npm vlt
    const standalone = receiptOf(self.dir, {
      method: 'standalone',
      channel: 'next',
    })
    const mod = await load(t, {
      self: { ...self, receipt: standalone },
    })
    t.match(await mod.selfUpdate(conf(g, ['vlt'])), {
      done: { case: 'npm', status: 'updated' },
    })
    t.strictSame(manifestCalls, ['vlt@latest'], 'channel ignored')
    t.strictSame(mod.receipts, [], 'not rewritten')

    // a global-project copy linked where a receipt points
    const copy: Self = {
      ...self,
      dir: real(join(g, 'bin')),
      target: real(
        join(
          g,
          'node_modules/.vlt',
          id('1.2.3'),
          'node_modules/vlt/vlt.js',
        ),
      ),
    }
    for (const receipt of [
      standalone,
      receiptOf(copy.dir, { channel: 'next' }),
    ]) {
      const mod = await load(t, {
        self: { ...copy, receipt, standalone: true },
      })
      manifestCalls.length = 0
      t.match(await mod.selfUpdate(conf(g, ['vlt'])), {
        selfUnwritable: false,
      })
      t.strictSame(manifestCalls, ['vlt@latest'])
    }
  })

  t.test('global-project copy', async t => {
    const { g, self } = fixture(t)
    const copy: Self = {
      ...self,
      dir: real(join(g, 'bin')),
      target: real(
        join(
          g,
          'node_modules/.vlt',
          id('1.2.3'),
          'node_modules/vlt/vlt.js',
        ),
      ),
    }
    const mod = await load(t, { self: copy })
    const c = conf(g, ['vlt'])
    const plan = await mod.selfUpdate(c)
    t.match(plan, { selfUnwritable: false })
    t.strictSame(c.positionals, ['vlt@1.3.0'], 'pinned')
  })

  t.test('npm sibling, posix', async t => {
    linux(t)
    const { g, self, npmCli } = fixture(t)
    const mod = await load(t, { self })
    t.match(await mod.selfUpdate(conf(g, ['vlt'])), {
      done: { case: 'npm', status: 'updated', dir: self.dir },
    })
    t.equal(mod.spawned[0]?.args[0], npmCli)
    t.strictSame(mod.receipts, [], 'no receipt to rewrite')
  })

  t.test("node's bundled npm, posix", async t => {
    linux(t)
    const { g, self, root } = fixture(t, {
      sibling: false,
      bundled: true,
    })
    t.intercept(process, 'execPath', {
      value: join(root, 'node/bin/node'),
    })
    const mod = await load(t, { self })
    await mod.selfUpdate(conf(g, ['vlt']))
    t.equal(
      mod.spawned[0]?.args[0],
      join(root, 'node/lib/node_modules/npm/bin/npm-cli.js'),
    )
    t.equal(mod.spawned[0]?.cmd, join(root, 'node/bin/node'))
  })

  t.test("node's bundled npm, win32", async t => {
    const root = t.testdir({
      npm: { 'vlt.cmd': '', node_modules: { vlt: { 'vlt.js': '' } } },
      nodejs: {
        'node.exe': '',
        node_modules: { npm: { bin: { 'npm-cli.js': '' } } },
      },
      g: {},
    })
    t.intercept(process, 'platform', { value: 'win32' })
    t.intercept(process, 'execPath', {
      value: join(root, 'nodejs/node.exe'),
    })
    const self: Self = {
      found: join(root, 'npm', 'vlt.cmd'),
      dir: real(join(root, 'npm')),
      target: real(join(root, 'npm/node_modules/vlt/vlt.js')),
      standalone: false,
    }
    const mod = await load(t, { self })
    await mod.selfUpdate(conf(join(root, 'g'), ['vlt']))
    t.strictSame(mod.spawned[0]?.args.slice(0, 5), [
      join(root, 'nodejs/node_modules/npm/bin/npm-cli.js'),
      'install',
      '--global',
      '--prefix',
      real(join(root, 'npm')),
    ])

    // yarn/bun global: shims are not in the node_modules parent
    const mod2 = await load(t, {
      self: { ...self, dir: real(join(root, 'nodejs')) },
    })
    refused(
      t,
      await mod2.selfUpdate(conf(join(root, 'g'), ['vlt'])),
      /not managed by vlt or npm/,
    )
  })

  t.test('npm found in the PATH', async t => {
    linux(t)
    const { g, self, root } = fixture(t, { sibling: false })
    t.intercept(process, 'execPath', {
      value: join(root, 'node/bin/node'),
    })
    const linked = join(root, 'npmlink')
    for (const [found, npmCli] of [
      // through a link
      [
        join(linked, 'bin/npm'),
        real(join(linked, 'npm/bin/npm-cli.js')),
      ],
      // the file itself
      [
        join(root, 'other/npm-cli.js'),
        real(join(root, 'other/npm-cli.js')),
      ],
    ] as const) {
      const mod = await load(t, { self, which: () => found })
      await mod.selfUpdate(conf(g, ['vlt']))
      t.equal(mod.spawned[0]?.args[0], npmCli)
    }
    for (const which of [
      () => join(root, 'other/npm'),
      () => null,
      () => {
        throw new Error('which')
      },
    ]) {
      const mod = await load(t, { self, which })
      refused(
        t,
        await mod.selfUpdate(conf(g, ['vlt'])),
        /not managed by vlt or npm/,
      )
      t.equal(mod.spawned.length, 0)
    }
  })

  t.test('not npm layouts', async t => {
    linux(t)
    const { g, self, root } = fixture(t)
    t.intercept(process, 'execPath', {
      value: join(root, 'node/bin/node'),
    })
    for (const target of [
      real(join(root, 'noLib/node_modules/vlt/vlt.js')),
      real(join(root, 'checkout/vlt.js')),
    ]) {
      const mod = await load(t, { self: { ...self, target } })
      refused(
        t,
        await mod.selfUpdate(conf(g, ['vlt'])),
        /not managed by vlt or npm/,
      )
    }
  })

  t.test('self dir not writable: bootstrap', async t => {
    linux(t)
    const { g, self, root } = fixture(t)
    t.intercept(process, 'execPath', {
      value: join(root, 'node/bin/node'),
    })
    const access = async (p: string, mode?: number) => {
      if (p === self.dir) throw eacces()
      return fsp.access(p, mode)
    }
    for (const target of [
      // npm
      self.target,
      // unknown
      real(join(root, 'other/npm')),
    ]) {
      const mod = await load(t, {
        self: { ...self, target },
        fsp: { access },
      })
      const c = conf(g, ['vlt'])
      t.match(await mod.selfUpdate(c), { selfUnwritable: true })
      t.equal(mod.spawned.length, 0, 'npm not run')
      t.strictSame(c.positionals, ['vlt@1.3.0'])
    }
  })

  t.test("npm's node_modules not writable: npm runs", async t => {
    linux(t)
    const { g, self, prefix } = fixture(t)
    const nm = join(prefix, 'lib', 'node_modules')
    const mod = await load(t, {
      self,
      close: 243,
      fsp: {
        access: async (p: string, mode?: number) => {
          if (p === nm) throw eacces()
          return fsp.access(p, mode)
        },
      },
    })
    t.match(await mod.selfUpdate(conf(g, ['vlt'])), {
      done: { case: 'npm', status: 'failed' },
    })
    t.equal(mod.spawned.length, 1, 'npm says EACCES')
    t.equal(process.exitCode, 243)
  })
})

t.test('version', async t => {
  t.test('same version: up to date, nothing done', async t => {
    linux(t)
    const { g, self } = fixture(t)
    const mod = await load(t, {
      self: { ...self, receipt: receiptOf(self.dir) },
    })
    t.strictSame(
      await mod.selfUpdate(
        conf(g, ['vlt'], { name: 'vlt', version: '1.2.3' }),
      ),
      {
        done: {
          case: 'npm',
          from: '1.2.3',
          to: '1.2.3',
          dir: self.dir,
          status: 'up-to-date',
        },
      },
    )
    t.equal(mod.spawned.length, 0)
    t.strictSame(mod.receipts, [])
  })

  t.test('implicit spec never downgrades', async t => {
    linux(t)
    const { g, self } = fixture(t)
    const mod = await load(t, { self })
    const old = { name: 'vlt', version: '1.0.0' }
    t.match(await mod.selfUpdate(conf(g, ['vlt'], old)), {
      done: { status: 'newer-running', tag: 'latest', to: '1.0.0' },
    })
    t.equal(mod.spawned.length, 0)
    t.match(await mod.selfUpdate(conf(g, ['vlt@1.0.0'], old)), {
      done: { status: 'updated', to: '1.0.0' },
    })
    t.equal(mod.spawned[0]?.args.at(-1), 'vlt@1.0.0')
  })

  t.test('receipt channel is the implicit tag', async t => {
    linux(t)
    const { g, self } = fixture(t)
    const receipt = receiptOf(self.dir, { channel: 'next' })
    const mod = await load(t, { self: { ...self, receipt } })
    t.match(
      await mod.selfUpdate(
        conf(g, ['vlt'], { name: 'vlt', version: '1.0.0' }),
      ),
      { done: { status: 'newer-running', tag: 'next' } },
    )
    t.strictSame(manifestCalls, ['vlt@next'])
    manifestCalls.length = 0
    await mod.selfUpdate(
      conf(g, ['vlt@2'], { name: 'vlt', version: '2.0.0' }),
    )
    t.strictSame(manifestCalls, ['vlt@2'], 'explicit spec wins')
  })

  t.test('not a version of vlt', async t => {
    linux(t)
    const { g, self } = fixture(t)
    const mod = await load(t, { self })
    await t.rejects(
      mod.selfUpdate(
        conf(g, ['vlt@npm:x@1'], { name: 'x', version: '1.0.0' }),
      ),
      {
        message: 'vlt@npm:x@1 is not a version of vlt',
        cause: { code: 'EUSAGE', found: 'x' },
      },
    )
    await t.rejects(
      mod.selfUpdate(conf(g, ['vlt'], { name: 'vlt' })),
      {
        message: 'vlt is not a version of vlt',
      },
    )
  })
})

t.test('npm', async t => {
  t.test('file spec', async t => {
    linux(t)
    const { g, self } = fixture(t)
    const tgz = './vlt-1.3.0.tgz'
    const mod = await load(t, { self })
    const c = conf(g, [tgz])
    t.match(await mod.selfUpdate(c), { done: { status: 'updated' } })
    t.match(mod.spawned[0], {
      cmd: process.execPath,
      args: [
        String,
        'install',
        '--global',
        '--prefix',
        String,
        /^vlt@file:/,
      ],
      opts: { stdio: ['inherit', 2, 2] },
    })
    t.strictSame(c.positionals, [tgz])
  })

  t.test('npm fails', async t => {
    linux(t)
    const { exitCode } = process
    t.teardown(() => {
      process.exitCode = exitCode
    })
    const { g, self } = fixture(t)
    const receipt = receiptOf(self.dir)
    for (const [close, code] of [
      [2, 2],
      [null, 1],
    ] as const) {
      const mod = await load(t, { self: { ...self, receipt }, close })
      t.match(await mod.selfUpdate(conf(g, ['vlt'])), {
        done: { status: 'failed' },
      })
      t.equal(process.exitCode, code)
      t.strictSame(mod.receipts, [], 'receipt kept')
    }
    process.exitCode = exitCode
    const mod = await load(t, { self, close: new Error('spawn') })
    await t.rejects(mod.selfUpdate(conf(g, ['vlt'])), {
      message: 'spawn',
    })
  })
})

t.test('standalone', async t => {
  const setup = (t: Test, exe = '') => {
    const dir = t.testdir({
      [`vlt${exe}`]: 'old vlt',
      [`vlx${exe}`]: 'old vlx',
      [`vlr${exe}`]: t.fixture('symlink', `vlt${exe}`),
      g: {},
    })
    const self: Self = {
      found: join(dir, `vlt${exe}`),
      dir: real(dir),
      target: real(join(dir, `vlt${exe}`)),
      standalone: true,
      receipt: receiptOf(real(dir), {
        method: 'standalone',
        target: 'linux-x64',
        channel: 'latest',
        binaries: ['vlx', 'vlr', 'vlt', 'missing', '../up', 'vlx'],
      }),
    }
    // stat().uid is 0 on win32 CI
    t.intercept(process, 'getuid', { value: () => 0 })
    const calls: Parameters<FetchRelease>[0][] = []
    const fetchRelease =
      (bytes = (b: string) => `new ${b}`): FetchRelease =>
      async o => {
        calls.push(o)
        writeFileSync(o.dest, bytes(o.bin))
        return { checksum: sha(`new ${o.bin}`) }
      }
    return { dir, self, calls, fetchRelease, g: join(dir, 'g') }
  }
  const files = (dir: string) =>
    readdirSync(dir)
      .filter(f => f !== 'g')
      .sort()

  t.test('replace, posix', async t => {
    linux(t)
    const { dir, self, calls, fetchRelease, g } = setup(t)
    const mode = statSync(join(dir, 'vlt')).mode & 0o777
    const renames: string[] = []
    const mod = await load(t, {
      self,
      fsp: {
        rename: async (a: string, b: string) => {
          renames.push(`${a.slice(self.dir.length + 1)} ${b}`)
          return fsp.rename(a, b)
        },
      },
    })
    const res = await mod.selfUpdate(conf(g, ['vlt']), {
      fetchRelease: fetchRelease(),
    })
    t.match(res, {
      done: { case: 'standalone', status: 'updated', to: '1.3.0' },
    })
    t.match(calls, [
      {
        version: '1.3.0',
        target: 'linux-x64',
        channel: 'latest',
        bin: 'vlx',
      },
      { bin: 'vlt' },
    ])
    t.equal(calls.length, 2, 'links and missing names skipped')
    t.strictSame(
      renames.map(r => r.split(' ')[0]),
      ['.vlx-1.3.0.tmp', '.vlt-1.3.0.tmp'],
      'vlt last',
    )
    t.equal(readFileSync(join(dir, 'vlt'), 'utf8'), 'new vlt')
    t.equal(readFileSync(join(dir, 'vlx'), 'utf8'), 'new vlx')
    if (process.platform !== 'win32') {
      t.equal(statSync(join(dir, 'vlt')).mode & 0o777, mode)
    }
    t.strictSame(files(dir), ['vlr', 'vlt', 'vlx'], 'no tmp left')
    t.strictSame(mod.receipts, [
      [self.receipt?.file, { version: '1.3.0' }],
    ])
  })

  t.test('bad checksum: nothing replaced', async t => {
    linux(t)
    const { dir, self, fetchRelease, g } = setup(t)
    const mod = await load(t, { self })
    await t.rejects(
      mod.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: fetchRelease(b =>
          b === 'vlt' ? 'evil' : `new ${b}`,
        ),
      }),
      {
        message: 'Checksum mismatch for vlt 1.3.0',
        cause: {
          code: 'EINTEGRITY',
          wanted: sha('new vlt'),
          found: sha('evil'),
        },
      },
    )
    t.equal(readFileSync(join(dir, 'vlt'), 'utf8'), 'old vlt')
    t.equal(readFileSync(join(dir, 'vlx'), 'utf8'), 'old vlx')
    t.strictSame(files(dir), ['vlr', 'vlt', 'vlx'], 'no tmp left')
    t.strictSame(mod.receipts, [])
  })

  t.test('download fails: no tmp left', async t => {
    linux(t)
    const { dir, self, g } = setup(t)
    const mod = await load(t, { self })
    await t.rejects(
      mod.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: async o => {
          writeFileSync(o.dest, 'partial')
          throw new Error('offline')
        },
      }),
      { message: 'offline' },
    )
    t.strictSame(files(dir), ['vlr', 'vlt', 'vlx'])
  })

  t.test('no release channel or target: installer line', async t => {
    linux(t)
    const { self, g, fetchRelease } = setup(t)
    const mod = await load(t, { self })
    refused(t, await mod.selfUpdate(conf(g, ['vlt'])), installerLine)
    const receipt = receiptOf(self.dir, { method: 'standalone' })
    const mod2 = await load(t, { self: { ...self, receipt } })
    refused(
      t,
      await mod2.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: fetchRelease(),
      }),
      installerLine,
    )
  })

  t.test('not a registry version', async t => {
    linux(t)
    const { self, g, fetchRelease, calls } = setup(t)
    const mod = await load(t, { self })
    await t.rejects(
      mod.selfUpdate(conf(g, ['./vlt-1.3.0.tgz']), {
        fetchRelease: fetchRelease(),
      }),
      {
        message: './vlt-1.3.0.tgz is not a vlt release',
        cause: { code: 'EUSAGE' },
      },
    )
    await t.rejects(
      mod.selfUpdate(
        conf(g, ['vlt@1'], { name: 'vlt', version: '1.3.0/../x' }),
        { fetchRelease: fetchRelease() },
      ),
      { message: 'vlt@1 is not a vlt release' },
    )
    t.strictSame(calls, [])
  })

  t.test('receipt write fails: still updated', async t => {
    linux(t)
    const { self, fetchRelease, g } = setup(t)
    const mod = await load(t, { self, receiptFails: true })
    t.match(
      await mod.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: fetchRelease(),
      }),
      { done: { status: 'updated' } },
    )
  })

  t.test('owned by root', async t => {
    linux(t)
    const { dir, self, fetchRelease, g } = setup(t)
    const stat = async (p: string) => {
      const st = await fsp.stat(p)
      return p === self.found ? Object.assign(st, { uid: 0 }) : st
    }
    const mod = await load(t, { self, fsp: { stat } })
    t.intercept(process, 'getuid', { value: () => 1000 })
    refused(
      t,
      await mod.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: fetchRelease(),
      }),
      `vlt at ${prettyPath(real(dir))} is owned by root. Update it the way you installed it, or run this as root.`,
    )
    t.intercept(process, 'getuid', { value: undefined })
    refused(
      t,
      await mod.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: fetchRelease(),
      }),
      /owned by root/,
    )
    t.intercept(process, 'getuid', { value: () => 0 })
    t.match(
      await mod.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: fetchRelease(),
      }),
      { done: { status: 'updated' } },
      'running as root',
    )
  })

  t.test('not writable', async t => {
    linux(t)
    const { dir, self, fetchRelease, g } = setup(t)
    const mod = await load(t, {
      self,
      fsp: {
        access: async (p: string, m?: number) => {
          if (p === self.dir) throw eacces()
          return fsp.access(p, m)
        },
      },
    })
    refused(
      t,
      await mod.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: fetchRelease(),
      }),
      `vlt at ${prettyPath(real(dir))} is not writable. Update it the way you installed it.`,
    )
  })

  t.test('win32', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    const stat = async (p: string) =>
      Object.assign(await fsp.stat(p), { uid: 0 })

    t.test('rename to .old first, stale .old removed', async t => {
      const { dir, self, fetchRelease, g } = setup(t, '.exe')
      writeFileSync(join(dir, 'vlt.exe.old'), 'stale')
      const renames: string[] = []
      const rel = (p: string) => p.slice(self.dir.length + 1)
      const mod = await load(t, {
        self,
        fsp: {
          stat,
          rename: async (a: string, b: string) => {
            renames.push(`${rel(a)} ${rel(b)}`)
            return fsp.rename(a, b)
          },
        },
      })
      t.match(
        await mod.selfUpdate(conf(g, ['vlt']), {
          fetchRelease: fetchRelease(),
        }),
        { done: { status: 'updated' } },
        'uid ignored',
      )
      t.strictSame(renames, [
        'vlx.exe vlx.exe.old',
        '.vlx-1.3.0.tmp vlx.exe',
        'vlt.exe vlt.exe.old',
        '.vlt-1.3.0.tmp vlt.exe',
      ])
      t.equal(readFileSync(join(dir, 'vlt.exe'), 'utf8'), 'new vlt')
      t.equal(
        readFileSync(join(dir, 'vlt.exe.old'), 'utf8'),
        'old vlt',
      )
    })

    t.test('stale .old busy: the rename decides', async t => {
      const { dir, self, fetchRelease, g } = setup(t, '.exe')
      writeFileSync(join(dir, 'vlt.exe.old'), 'stale')
      const mod = await load(t, {
        self,
        fsp: {
          stat,
          rm: async (p: string, o?: RmOptions) => {
            if (p.endsWith('.old')) {
              throw Object.assign(new Error('busy'), {
                code: 'EBUSY',
              })
            }
            return fsp.rm(p, o)
          },
        },
      })
      t.match(
        await mod.selfUpdate(conf(g, ['vlt']), {
          fetchRelease: fetchRelease(),
        }),
        { done: { status: 'updated' } },
      )
      t.equal(readFileSync(join(dir, 'vlt.exe'), 'utf8'), 'new vlt')
    })

    t.test('replace fails: .old restored', async t => {
      const { dir, self, fetchRelease, g } = setup(t, '.exe')
      const mod = await load(t, {
        self,
        fsp: {
          stat,
          rename: async (a: string, b: string) => {
            if (a.endsWith('.vlt-1.3.0.tmp')) throw eacces()
            return fsp.rename(a, b)
          },
        },
      })
      await t.rejects(
        mod.selfUpdate(conf(g, ['vlt']), {
          fetchRelease: fetchRelease(),
        }),
        {
          message: `Could not replace ${join(real(dir), 'vlt.exe')}. Close other vlt processes and editors, and check permissions.`,
          cause: {
            path: join(real(dir), 'vlt.exe'),
            cause: { code: 'EACCES' },
          },
        },
      )
      t.equal(readFileSync(join(dir, 'vlt.exe'), 'utf8'), 'old vlt')
      t.notOk(existsSync(join(dir, 'vlt.exe.old')))
      t.notOk(existsSync(join(dir, '.vlt-1.3.0.tmp')), 'tmp removed')
    })

    t.test('running file cannot be moved', async t => {
      const { dir, self, fetchRelease, g } = setup(t, '.exe')
      const mod = await load(t, {
        self,
        fsp: {
          stat,
          rename: async (a: string, b: string) => {
            if (b.endsWith('vlt.exe.old')) throw eacces()
            return fsp.rename(a, b)
          },
        },
      })
      await t.rejects(
        mod.selfUpdate(conf(g, ['vlt']), {
          fetchRelease: fetchRelease(),
        }),
        { message: /^Could not replace .*vlt\.exe\./ },
      )
      t.equal(readFileSync(join(dir, 'vlt.exe'), 'utf8'), 'old vlt')
      t.notOk(existsSync(join(dir, '.vlt-1.3.0.tmp')), 'tmp removed')
    })
  })

  t.test(
    'old file stays readable while replaced',
    { skip: process.platform === 'win32' },
    async t => {
      const { dir, self, fetchRelease, g } = setup(t)
      const fd = openSync(join(dir, 'vlt'), 'r')
      t.teardown(() => closeSync(fd))
      const mod = await load(t, { self })
      await mod.selfUpdate(conf(g, ['vlt']), {
        fetchRelease: fetchRelease(),
      })
      const buf = Buffer.alloc(7)
      readSync(fd, buf, 0, 7, 0)
      t.equal(buf.toString(), 'old vlt')
      t.equal(readFileSync(join(dir, 'vlt'), 'utf8'), 'new vlt')
    },
  )
})

t.test('finish', async t => {
  const { g, self, root } = fixture(t)
  const global: GlobalBins = {
    binDir: join(root, 'local-bin'),
    source: 'local-bin',
    bins: ['vlt'],
    conflicts: [],
    inPath: true,
    otherDirs: [],
  }
  const finish = async (
    t: Test,
    o: Opts,
    g2?: GlobalBins,
    positionals = ['vlt'],
  ) => {
    const mod = await load(t, o)
    const plan = await mod.selfUpdate(conf(g, positionals))
    if (!plan || 'done' in plan) throw new Error('no plan')
    return { res: await plan.finish(g2), mod }
  }

  t.test('global-project', async t => {
    const copy: Self = {
      ...self,
      dir: real(join(g, 'bin')),
      target: real(
        join(
          g,
          'node_modules/.vlt',
          id('1.2.3'),
          'node_modules/vlt/vlt.js',
        ),
      ),
    }
    t.strictSame((await finish(t, { self: copy }, global)).res, {
      case: 'global-project',
      from: '1.2.3',
      to: '1.3.0',
      dir: global.binDir,
      status: 'updated',
    })
    t.equal(
      (await finish(t, { self: copy })).res.dir,
      copy.dir,
      'no bins: self dir',
    )
  })

  t.test('bootstrap', async t => {
    linux(t)
    const fspMock = {
      access: async (p: string, m?: number) => {
        if (p === self.dir) throw eacces()
        return fsp.access(p, m)
      },
    }
    const o = { self, fsp: fspMock }
    const shadowed = await finish(
      t,
      { ...o, which: () => self.found },
      global,
    )
    t.match(shadowed.res, {
      case: 'bootstrap',
      dir: global.binDir,
      notWritable: self.dir,
      shadowedBy: dirname(self.found),
    })
    const first = await finish(
      t,
      { ...o, which: () => join(global.binDir, 'vlt') },
      global,
    )
    t.equal(first.res.shadowedBy, undefined, 'new copy runs first')
    const third = await finish(
      t,
      { ...o, which: () => join(root, 'other', 'npm') },
      global,
    )
    t.equal(
      third.res.shadowedBy,
      join(root, 'other'),
      'any other dir',
    )
    const none = await finish(t, { ...o, which: () => null }, global)
    t.equal(none.res.shadowedBy, undefined)
    const thrown = await finish(
      t,
      {
        ...o,
        which: () => {
          throw new Error('which')
        },
      },
      global,
    )
    t.equal(thrown.res.shadowedBy, undefined)
    for (const g2 of [
      { ...global, inPath: false },
      { ...global, bins: ['vlx'] },
      undefined,
    ]) {
      const { res, mod } = await finish(t, o, g2)
      t.strictSame(mod.whichCalls, [], 'which not called')
      t.equal(res.shadowedBy, undefined)
    }
  })
})

t.test('refuseSelfUninstall', async t => {
  const { g, self, root } = fixture(t)
  const c = (
    positionals = ['vlt'],
    globalRoot: string | undefined = g,
  ) => conf(globalRoot, positionals)
  const none = await load(t)
  t.equal(await none.refuseSelfUninstall(c(['vlt'], '')), undefined)
  t.equal(await none.refuseSelfUninstall(c(['eslint'])), undefined)
  t.equal(await none.refuseSelfUninstall(c()), undefined, 'no self')
  t.equal(none.findSelfCalls(), 1)

  const ws = join(root, 'ws')
  const npm = await load(t, { self })
  t.equal(
    await npm.refuseSelfUninstall(c(['vlt'], ws)),
    undefined,
    'global pkg',
  )
  t.equal(npm.findSelfCalls(), 0)

  const done = async (p: Promise<unknown>) => ({ done: await p })
  linux(t)
  refused(
    t,
    await done(npm.refuseSelfUninstall(c())),
    'vlt was installed by npm. Run `npm uninstall -g vlt` to remove it.',
  )
  t.intercept(process, 'env', {
    value: { ...process.env, HOMEBREW_CELLAR: real(root) },
  })
  refused(
    t,
    await done(npm.refuseSelfUninstall(c())),
    'vlt was installed by Homebrew. Run `brew uninstall vlt` to remove it.',
  )
  const other = await load(t, { self: { ...self, standalone: true } })
  t.intercept(process, 'env', {
    value: { ...process.env, HOMEBREW_CELLAR: '' },
  })
  refused(
    t,
    await done(other.refuseSelfUninstall(c())),
    `vlt at ${prettyPath(self.dir)} is not managed by vlt. Remove it the way you installed it.`,
  )
})

t.test('runningStoreDep', async t => {
  const { g, root } = fixture(t)
  const mod = await load(t)
  const argv = (a?: string) =>
    t.intercept(process, 'argv', {
      value: a ? [process.execPath, a] : [process.execPath],
    })
  argv(
    join(
      g,
      'node_modules/.vlt',
      id('1.2.3'),
      'node_modules/vlt/vlt.js',
    ),
  )
  t.equal(await mod.runningStoreDep(g), id('1.2.3'))
  argv(join(root, 'prefix/lib/node_modules/vlt/vlt.js'))
  t.equal(await mod.runningStoreDep(g), undefined, 'outside')
  argv(join(g, 'node_modules/.vlt'))
  t.equal(await mod.runningStoreDep(g), undefined, 'not a dep id')
  argv()
  t.equal(await mod.runningStoreDep(g), undefined, 'no argv[1]')
  argv(join(root, 'prefix/lib/node_modules/vlt/vlt.js'))
  t.equal(
    await mod.runningStoreDep(join(root, 'prefix')),
    undefined,
    'no store',
  )
})

t.test('deferSelfRemove', async t => {
  const mod = await load(t)
  const store = () => ({ node_modules: { '.vlt': {} } })
  const dir = t.testdir({ a: store(), b: store(), c: store() })
  const added = join(dir, 'a')
  const kept = join(dir, 'b')
  const b = join(dir, 'c')
  const graph = (...ids: string[]) =>
    ({
      nodes: new Map(ids.map(i => [i, {}])),
    }) as unknown as Parameters<typeof mod.deferSelfRemove>[1]
  const state = (root: string) =>
    JSON.parse(
      readFileSync(join(root, 'global-state.json'), 'utf8'),
    ) as unknown
  const storeOf = (root: string) =>
    resolve(real(root), 'node_modules/.vlt')

  await mod.deferSelfRemove(added, graph(id('1.3.0')), id('1.2.3'))
  t.strictSame(state(added), {
    pendingRemove: [resolve(storeOf(added), id('1.2.3'))],
  })

  await mod.deferSelfRemove(kept, graph(id('1.2.3')), id('1.2.3'))
  await mod.deferSelfRemove(kept, graph())
  t.notOk(
    existsSync(join(kept, 'global-state.json')),
    'nothing written',
  )

  const listed = [
    resolve(storeOf(b), id('1.0.0')),
    resolve(storeOf(b), id('1.1.0')),
  ]
  writeFileSync(
    join(b, 'global-state.json'),
    JSON.stringify({ pendingRemove: listed, x: 1 }),
  )
  await mod.deferSelfRemove(b, graph(id('1.1.0')), id('1.2.3'))
  t.strictSame(state(b), {
    pendingRemove: [listed[0], resolve(storeOf(b), id('1.2.3'))],
    x: 1,
  })
})

t.test('selfUpdateLines', async t => {
  const mod = await load(t)
  const s: SelfUpdate = {
    case: 'npm',
    status: 'updated',
    from: '1.2.3',
    to: '1.3.0',
    dir: '/p/bin',
  }
  t.strictSame(mod.selfUpdateLines(s), [
    '⬆️  Updated vlt 1.2.3 → 1.3.0 in /p/bin (via npm)',
  ])
  for (const c of ['standalone', 'global-project'] as const) {
    t.strictSame(mod.selfUpdateLines({ ...s, case: c }), [
      '⬆️  Updated vlt 1.2.3 → 1.3.0 in /p/bin',
    ])
  }
  t.strictSame(mod.selfUpdateLines({ ...s, status: 'up-to-date' }), [
    '✅ vlt 1.3.0 is already up to date',
  ])
  t.strictSame(
    mod.selfUpdateLines({
      ...s,
      status: 'newer-running',
      from: '2.0.0',
      tag: 'latest',
    }),
    [
      'ℹ️  vlt 2.0.0 is running but "latest" is 1.3.0; run `vlt i -g vlt@latest` to downgrade',
    ],
  )
  t.strictSame(mod.selfUpdateLines({ ...s, status: 'failed' }), [])
  t.strictSame(
    mod.selfUpdateLines({
      status: 'refused',
      from: '1.2.3',
      dir: '/p/bin',
      message: 'nope',
    }),
    ['nope'],
  )
  const boot: SelfUpdate = {
    ...s,
    case: 'bootstrap',
    notWritable: '/usr/bin',
  }
  t.strictSame(mod.selfUpdateLines(boot), [
    'ℹ️  /usr/bin is not writable, so vlt 1.3.0 was installed as a global package.',
  ])
  t.strictSame(
    mod.selfUpdateLines({ ...boot, shadowedBy: '/usr/bin' }),
    [
      'ℹ️  /usr/bin is not writable, so vlt 1.3.0 was installed as a global package.',
      '⚠️  /usr/bin is earlier in your PATH, so `vlt` still runs vlt 1.2.3.',
    ],
  )
  t.match(mod.selfUpdateLines({ ...boot, notWritable: undefined }), [
    'ℹ️  /p/bin is not writable',
  ])
})

t.test('isSelfUpdateArgs', async t => {
  const mod = await load(t)
  const c = (positionals: string[], command = 'install', g = '/g') =>
    ({
      command,
      globalRoot: g,
      positionals,
    }) as unknown as LoadedConfig
  t.equal(mod.isSelfUpdateArgs(c(['vlt'])), true)
  t.equal(mod.isSelfUpdateArgs(c(['x', 'vlt@1'])), true)
  t.equal(mod.isSelfUpdateArgs(c(['vltx'])), false)
  t.equal(mod.isSelfUpdateArgs(c(['@s/vlt'])), false)
  for (const tgz of [
    './vlt-1.3.0.tgz',
    'file:vlt-1.3.0.tgz',
    'C:\\x\\vlt-1.3.0.tgz',
    'https://r.example/vlt/-/vlt-1.3.0.tgz',
  ]) {
    t.equal(mod.isSelfUpdateArgs(c([tgz])), true, tgz)
  }
  for (const tgz of ['./notvlt-1.0.0.tgz', './vlt-x.tgz']) {
    t.equal(mod.isSelfUpdateArgs(c([tgz])), false, tgz)
  }
  t.equal(mod.isSelfUpdateArgs(c(['vlt'], 'uninstall')), false)
  t.equal(mod.isSelfUpdateArgs(c(['vlt'], 'install', '')), false)
})
