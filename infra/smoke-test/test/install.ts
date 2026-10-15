import t from 'tap'
import { Artifacts, runMultiple } from './fixtures/run.ts'
import {
  chmodSync,
  existsSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join, relative } from 'node:path'
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
        const ws = join(g, 'packages', 'semver-global-ws')
        const lockfile = join(g, 'vlt-lock.json')
        const lock = JSON.parse(readFileSync(lockfile, 'utf-8'))
        t.ok(
          lock.edges['workspace~packages+semver-global-ws semver'],
          'semver should be in the global lockfile',
        )
        t.match(
          JSON.parse(readFileSync(join(ws, 'package.json'), 'utf-8')),
          {
            name: 'semver-global-ws',
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
