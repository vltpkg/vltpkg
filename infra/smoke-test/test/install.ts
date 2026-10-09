import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

t.test('global install', async t => {
  const { status } = await runMultiple(
    t,
    ['install', '-g', 'semver'],
    {
      match: ['status'],
      test: async ({ t, dirs, run }) => {
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
