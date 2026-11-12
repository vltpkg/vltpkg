import { emitter } from '@vltpkg/output'
import * as fs from 'node:fs'
import { join } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'

const mirror = 'https://registry.vlt.io/upstream/npm/'

type Setup = {
  values?: Record<string, unknown>
  registry?: string
  registries?: Record<string, string>
  userRegistries?: Record<string, string>
  ci?: boolean
  tty?: boolean
  fs?: Partial<typeof fs>
}

const setup = async (t: Test, opts: Setup = {}) => {
  const dir = t.testdir()
  const messages: string[] = []
  t.intercept(process.stderr, 'isTTY', { value: opts.tty ?? true })
  const exitCode = process.exitCode
  process.exitCode = undefined
  t.teardown(() => {
    process.exitCode = exitCode
  })
  const { watchMirrorNotice, mirrorNotice } = await t.mockImport<
    typeof import('../src/mirror-notice.ts')
  >('../src/mirror-notice.ts', {
    'node:fs': t.createMock(fs, opts.fs ?? {}),
    '@vltpkg/output': { emitter },
    '@vltpkg/xdg': {
      XDG: class {
        state = (path: string) => join(dir, 'state', path)
      },
    },
    '../src/output.ts': {
      isCI: () => !!opts.ci,
      stderr: (line: string) => messages.push(line),
    },
  })
  const conf = {
    values: { view: 'human', ...opts.values },
    options: {
      registry: opts.registry,
      registries: opts.registries ?? { npm: mirror },
    },
    getRecord: () => opts.userRegistries ?? {},
  } as unknown as LoadedConfig
  const run = (
    urls: (string | URL)[] = [`${mirror}abbrev`],
    failed = false,
  ) => {
    const done = watchMirrorNotice(conf)
    for (const url of urls)
      emitter.emit('request', { url, state: 'start' })
    if (failed) process.exitCode = 1
    done()
  }
  return { run, messages, mirrorNotice, marker: join(dir, 'state') }
}

t.test(
  'prints once after a request to the public mirror',
  async t => {
    const { run, messages, mirrorNotice, marker } = await setup(t)
    t.match(mirrorNotice, /vlt's public npm mirror/)
    t.match(mirrorNotice, /`vlt setup`/)
    run([new URL(`${mirror}abbrev`)])
    t.strictSame(messages, [mirrorNotice], 'printed')
    t.ok(
      fs.existsSync(join(marker, 'public-mirror-notice')),
      'marked',
    )
    run()
    t.strictSame(messages, [mirrorNotice], 'not printed again')
    emitter.emit('request', { url: `${mirror}x`, state: 'start' })
    t.strictSame(messages, [mirrorNotice], 'unsubscribed')
  },
)

t.test('no notice', async t => {
  const cases: [string, Setup, (string | URL)[]?][] = [
    [
      'no request to the mirror',
      {},
      ['https://registry.npmjs.org/a'],
    ],
    ['stderr is not a TTY', { tty: false }],
    ['not the human view', { values: { view: 'json' } }],
    ['--help', { values: { help: true } }],
    ['CI', { ci: true }],
    [
      'a scalar registry',
      { registry: 'https://registry.npmjs.org/' },
    ],
    [
      'a user registries.npm, even the mirror',
      { userRegistries: { npm: mirror } },
    ],
    [
      'an overridden npm alias',
      { registries: { npm: 'https://registry.npmjs.org/' } },
    ],
    [
      'an unwritable state dir',
      {
        fs: {
          mkdirSync: () => {
            throw new Error('EACCES')
          },
        },
      },
    ],
  ]
  for (const [name, opts, urls] of cases) {
    await t.test(name, async t => {
      const { run, messages, marker } = await setup(t, opts)
      run(urls)
      t.strictSame(messages, [])
      if (!opts.fs) {
        t.notOk(fs.existsSync(join(marker, 'public-mirror-notice')))
      }
    })
  }

  await t.test('the command failed', async t => {
    const { run, messages, marker } = await setup(t)
    run(undefined, true)
    t.strictSame(messages, [])
    t.notOk(fs.existsSync(join(marker, 'public-mirror-notice')))
  })
})
