import t from 'tap'
import { Artifacts, runMultiple, Variants } from './fixtures/run.ts'
import type { MultipleCommandOptions } from './fixtures/run.ts'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { dirname, join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { ansiToAnsi } from 'ansi-to-pre'

t.test('help', async t => {
  const { status } = await runMultiple(t, ['install', '--help'])
  t.equal(status, 0)
})

t.test('install a package', async t => {
  const { status } = await runMultiple(t, ['i', 'eslint'], {
    test: async ({ t, dirs }) => {
      const lock = JSON.parse(
        readFileSync(join(dirs.project, 'vlt-lock.json'), 'utf-8'),
      )
      t.ok(
        lock.edges['file~_d eslint'],
        'eslint should be in the lockfile',
      )
    },
  })
  t.equal(status, 0)
})

t.test('tty', { skip: process.platform === 'win32' }, async t => {
  const { status, output } = await runMultiple(t, ['i', 'abbrev'], {
    tty: true,
    match: ['status'],
    cleanOutput: v =>
      stripVTControlCharacters(ansiToAnsi(v))
        .replace(/\d+(ms)/, '{{TIME}}$1')
        .replace(/\d+( requests)/, '{{REQUESTS}}$1'),
  })
  t.match(output, '{{REQUESTS}}')
  t.match(output, '{{TIME}}')
  t.match(output, 'resolving dependencies')
  t.match(output, 'extracting files')
  t.equal(status, 0)
})

t.test(
  'global install offers PATH setup',
  { skip: process.platform === 'win32' },
  async t => {
    const { status, output } = await runMultiple(
      t,
      ['install', '-g', 'semver', '--yes'],
      {
        tty: true,
        env: { SHELL: '/bin/bash' },
        match: ['status'],
        test: async ({ t, dirs }) => {
          t.match(
            readFileSync(join(dirs.root, '.profile'), 'utf-8'),
            '# vlt\n',
          )
          t.ok(existsSync(join(dirs.data, 'vlt', 'global', 'env')))
        },
      },
    )
    t.match(output, 'Run `vlt setup --path` to add it')
    t.match(output, 'Added')
    t.equal(status, 0)
  },
)

t.test('no registry configured', async t => {
  const { status, output } = await runMultiple(t, ['i', 'abbrev'], {
    match: ['status'],
    // unset the registry that run.ts configures by default
    env: { VLT_REGISTRY: '', VLT_REGISTRIES: '' },
  })
  t.not(status, 0, 'exits non-zero')
  t.match(output, 'Missing registry configuration')
  t.match(output, 'https://docs.vlt.sh/cli')
})

t.test('no registry configured, --help still works', async t => {
  const { status, output } = await runMultiple(
    t,
    ['install', '--help'],
    {
      match: ['status'],
      env: { VLT_REGISTRY: '', VLT_REGISTRIES: '' },
    },
  )
  t.equal(status, 0, 'exits zero')
  t.match(output, 'vlt install')
})

t.test('no registries.npm configured', async t => {
  const { status, output } = await runMultiple(t, ['i', 'abbrev'], {
    match: ['status'],
    // scalar --registry still set via the fixture default; only the
    // npm alias is missing
    env: { VLT_REGISTRIES: '' },
  })
  t.not(status, 0, 'exits non-zero')
  t.match(output, 'Missing npm registry configuration')
  t.match(output, 'registries.npm')
})

t.test(
  'no registries.npm configured, --help still works',
  async t => {
    const { status, output } = await runMultiple(
      t,
      ['install', '--help'],
      {
        match: ['status'],
        env: { VLT_REGISTRIES: '' },
      },
    )
    t.equal(status, 0, 'exits zero')
    t.match(output, 'vlt install')
  },
)

t.test('failed install exits on its own', async t => {
  // 404 for all but `hang`, which never gets an answer
  const server = createServer((req, res) => {
    if (req.url?.includes('hang')) return
    res.statusCode = 404
    res.setHeader('content-type', 'application/json')
    res.end('{"error":"not found"}')
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  t.teardown(() => {
    server.closeAllConnections()
    server.close()
  })
  const { port } = server.address() as AddressInfo
  const reg = `http://127.0.0.1:${port}/`
  const { status, signal, output } = await runMultiple(
    t,
    ['install'],
    {
      packageJson: {
        name: 'x',
        dependencies: { hang: '1', missing: '1' },
      },
      env: { VLT_REGISTRY: reg, VLT_REGISTRIES: `npm=${reg}` },
      timeout: 30_000,
      match: ['status'],
    },
  )
  t.equal(signal, null, 'not killed')
  t.equal(status, 1)
  t.match(output, 'failed to fetch packument: 404')
  t.notMatch(output, /Node\.js v\d/, 'no crash')
})

t.test('global install', async t => {
  const { status } = await runMultiple(
    t,
    ['install', '-g', 'semver'],
    {
      match: ['status'],
      test: async ({ t, dirs, run, raw }) => {
        // no vlt in PATH: fallback dir
        t.match(JSON.parse(raw.stdout), {
          global: {
            source: 'global-dir',
            inPath: false,
            bins: ['semver'],
          },
        })
        const g = join(dirs.data, 'vlt', 'global')
        const ws = join(g, 'packages', 'semver-ws')
        const lockfile = join(g, 'vlt-lock.json')
        const lock = JSON.parse(readFileSync(lockfile, 'utf-8'))
        t.ok(
          lock.edges['workspace~packages+semver-ws semver'],
          'semver should be in the global lockfile',
        )
        t.match(
          JSON.parse(readFileSync(join(ws, 'package.json'), 'utf-8')),
          {
            name: 'semver-ws',
            dependencies: { semver: String },
          },
        )
        const bin = join(
          g,
          'bin',
          process.platform === 'win32' ? 'semver.cmd' : 'semver',
        )
        t.ok(existsSync(bin), 'bin linked')
        t.strictSame(
          JSON.parse(
            readFileSync(join(g, 'global-state.json'), 'utf-8'),
          ),
          { binDirs: [realpathSync.native(join(g, 'bin'))] },
        )
        t.notOk(existsSync(join(dirs.project, 'node_modules')))
        t.notOk(existsSync(join(dirs.project, 'vlt-lock.json')))

        const ls = await run(['ls', '-g', '--view=json'])
        t.equal(ls.status, 0)
        t.match(ls.stdout, 'semver')

        const rm = await run(['uninstall', '-g', 'semver'])
        t.equal(rm.status, 0)
        t.notOk(existsSync(ws), 'workspace removed')
        t.notOk(existsSync(bin), 'bin removed')
        t.notMatch(readFileSync(lockfile, 'utf-8'), 'semver')
      },
    },
  )
  t.equal(status, 0)
})

t.test('global install into the vlt folder', async t => {
  const { status } = await runMultiple(t, ['--version'], {
    // the Source bin is not executable
    variants: ['Bundle'],
    match: ['status'],
    root: { selfbin: {} },
    test: async ({ t, dirs, run }) => {
      const selfbin = join(dirs.root, 'selfbin')
      const vlt = Artifacts.Bundle.bin('vlt')
      const win32 = process.platform === 'win32'
      if (win32) {
        writeFileSync(
          join(selfbin, 'vlt.cmd'),
          `@node "%~dp0\\${relative(selfbin, vlt)}" %*\r\n`,
        )
      } else {
        chmodSync(vlt, 0o755)
        symlinkSync(vlt, join(selfbin, 'vlt'))
      }
      const res = await run(
        ['install', '-g', 'semver', '--view=json'],
        {
          env: { PATH: selfbin },
        },
      )
      t.equal(res.status, 0)
      const bin = join(selfbin, win32 ? 'semver.cmd' : 'semver')
      t.ok(existsSync(bin), 'bin linked next to vlt')
      const g = join(dirs.data, 'vlt', 'global')
      t.strictSame(
        JSON.parse(
          readFileSync(join(g, 'global-state.json'), 'utf-8'),
        ),
        { binDirs: [realpathSync.native(selfbin)] },
      )
      t.match(JSON.parse(res.stdout), {
        global: { source: 'self', inPath: true, bins: ['semver'] },
      })

      const rm = await run(['uninstall', '-g', 'semver'], {
        env: { PATH: '' },
      })
      t.equal(rm.status, 0)
      t.notOk(existsSync(bin), 'bin removed from the recorded dir')
    },
  })
  t.equal(status, 0)
})

type TestArgs = Parameters<
  NonNullable<MultipleCommandOptions['test']>
>[0]

const node = String(Variants.Bundle.args('vlt')[0])

// a vlt tarball of the bundle, as published
const vltTgz = async (
  { t, run }: Pick<TestArgs, 't' | 'run'>,
  dir: string,
  version: string,
) => {
  cpSync(Artifacts.Bundle.dir, dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'vlt',
      version,
      type: 'module',
      bin: { vlt: './vlt.js' },
    }),
  )
  const res = await run(['pack'], { cwd: dir })
  t.equal(res.status, 0, `packed ${version}`)
  return join(dir, `vlt-${version}.tgz`)
}

const readJSON = (f: string) =>
  JSON.parse(readFileSync(f, 'utf-8')) as Record<string, unknown>

t.test(
  'self-update a global-project copy',
  {
    skip:
      process.platform === 'win32' || process.getuid?.() === 0 ?
        'needs a read-only dir'
      : false,
  },
  async t => {
    const { status } = await runMultiple(t, ['--version'], {
      variants: ['Bundle'],
      match: ['status'],
      root: { selfbin: {}, a: {}, b: {} },
      test: async ({ t, dirs, run }) => {
        const selfbin = join(dirs.root, 'selfbin')
        const vlt = Artifacts.Bundle.bin('vlt')
        chmodSync(vlt, 0o755)
        symlinkSync(vlt, join(selfbin, 'vlt'))
        const tgzA = await vltTgz(
          { t, run },
          join(dirs.root, 'a'),
          '99.0.0',
        )
        const tgzB = await vltTgz(
          { t, run },
          join(dirs.root, 'b'),
          '99.0.1',
        )
        const g = join(dirs.data, 'vlt', 'global')
        const gbin = join(g, 'bin')
        const state = () =>
          readJSON(join(g, 'global-state.json')) as {
            pendingRemove?: string[]
          }

        // read-only self dir: installs itself as a global package
        chmodSync(selfbin, 0o555)
        t.teardown(() => chmodSync(selfbin, 0o755))
        const boot = await run(['i', '-g', tgzA, '--view=json'], {
          env: { PATH: selfbin },
        })
        t.equal(boot.status, 0)
        t.match(JSON.parse(boot.raw.stdout), {
          self: {
            case: 'bootstrap',
            status: 'updated',
            to: '99.0.0',
            notWritable: realpathSync.native(selfbin),
          },
        })
        t.ok(existsSync(join(gbin, 'vlt')), 'vlt linked')

        // that copy updates itself
        const up = await run(['i', '-g', tgzB, '--view=json'], {
          command: [node, join(gbin, 'vlt')],
          env: { PATH: gbin },
        })
        t.equal(up.status, 0)
        t.match(JSON.parse(up.raw.stdout), {
          self: {
            case: 'global-project',
            status: 'updated',
            from: '99.0.0',
            to: '99.0.1',
          },
        })
        const pending = state().pendingRemove ?? []
        t.equal(pending.length, 1, 'running version left in place')
        const old = String(pending[0])
        t.ok(existsSync(old))
        t.notOk(
          realpathSync(join(gbin, 'vlt')).startsWith(old + sep),
          'link moved to the new version',
        )

        // the next -g command removes it
        const ls = await run(['ls', '-g', '--view=json'], {
          env: { PATH: '' },
        })
        t.equal(ls.status, 0)
        t.notOk(existsSync(old), 'old version removed')
        t.strictSame(state().pendingRemove, [])
        t.match(ls.stdout, '99.0.1')
        t.notMatch(ls.stdout, '99.0.0')
      },
    })
    t.equal(status, 0)
  },
)

const win32 = process.platform === 'win32'
// node's own npm
const npmCli =
  win32 ?
    join(dirname(node), 'node_modules/npm/bin/npm-cli.js')
  : join(
      dirname(dirname(node)),
      'lib/node_modules/npm/bin/npm-cli.js',
    )

t.test(
  'self-update through npm',
  { skip: !existsSync(npmCli) && 'no npm next to node' },
  async t => {
    const { status } = await runMultiple(t, ['--version'], {
      variants: ['Bundle'],
      match: ['status'],
      root: { prefix: {}, a: {}, b: {} },
      test: async ({ t, dirs, run }) => {
        const P = join(dirs.root, 'prefix')
        const extras = {
          APPDATA: join(dirs.root, 'appdata'),
          LOCALAPPDATA: join(dirs.root, 'localappdata'),
          npm_config_cache: join(dirs.root, 'npm-cache'),
          npm_config_update_notifier: 'false',
          npm_config_audit: 'false',
          npm_config_fund: 'false',
          ...(win32 ? { SystemRoot: process.env.SystemRoot } : {}),
        }
        const tgzA = await vltTgz(
          { t, run },
          join(dirs.root, 'a'),
          '99.0.0',
        )
        const tgzB = await vltTgz(
          { t, run },
          join(dirs.root, 'b'),
          '99.0.1',
        )
        const npm = spawnSync(
          node,
          [npmCli, 'install', '--global', '--prefix', P, tgzA],
          {
            env: {
              ...process.env,
              HOME: dirs.root,
              USERPROFILE: dirs.root,
              ...extras,
            },
            encoding: 'utf8',
          },
        )
        t.equal(npm.status, 0, 'installed with npm', {
          stderr: npm.stderr,
        })
        const pkg = join(
          P,
          win32 ? '' : 'lib',
          'node_modules/vlt/package.json',
        )
        t.equal(readJSON(pkg).version, '99.0.0')

        // win32 `D:\x` paths don't parse as specs
        const specB = pathToFileURL(tgzB).href
        const res = await run(['i', '-g', specB, '--view=json'], {
          command: [
            node,
            win32 ?
              join(P, 'node_modules/vlt/vlt.js')
            : join(P, 'bin/vlt'),
          ],
          env: { PATH: win32 ? P : join(P, 'bin'), ...extras },
        })
        t.equal(res.status, 0, 'updated through npm', {
          stderr: res.stderr,
        })
        // npm's output went to stderr
        t.match(JSON.parse(res.raw.stdout), {
          self: { case: 'npm', status: 'updated', to: '99.0.1' },
        })
        t.equal(readJSON(pkg).version, '99.0.1')
      },
    })
    t.equal(status, 0)
  },
)
