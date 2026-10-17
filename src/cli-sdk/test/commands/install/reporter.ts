import { joinDepIDTuple } from '@vltpkg/dep-id'
import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import * as ink from 'ink'
import { PassThrough } from 'node:stream'
import { setTimeout } from 'node:timers/promises'
import t from 'tap'
import type { InstallResult } from '../../../src/commands/install.ts'
import type { LoadedConfig } from '../../../src/config/index.ts'

let out = ''
const stdout = Object.assign(new PassThrough(), { columns: 200 })
stdout.on('data', (c: Buffer) => (out = c.toString()))

const { InstallReporter } = await t.mockImport<
  typeof import('../../../src/commands/install/reporter.ts')
>('../../../src/commands/install/reporter.ts', {
  '@vltpkg/output': await import('@vltpkg/output'),
  react: await import('react'),
  ink: {
    ...ink,
    render: (el: Parameters<typeof ink.render>[0]) =>
      ink.render(el, {
        stdout: stdout as unknown as NodeJS.WriteStream,
        debug: true,
        patchConsole: false,
      }),
  },
})

const reporter = () => new InstallReporter({}, {} as LoadedConfig)
const request = (state: Events['request']['state']) =>
  emitter.emit('request', { url: 'https://x/', state })

t.test('steps, requests and trailer', async t => {
  const r = reporter()
  r.start()
  await setTimeout(50)
  t.match(out, 'resolving dependencies')
  emitter.emit('graphStep', { step: 'build', state: 'start' })
  request('start')
  await setTimeout(50)
  t.match(out, /1 request$/m)
  request('start')
  request('cache')
  await setTimeout(50)
  t.match(out, '2 requests')
  t.match(out, '1 cache hit')
  emitter.emit('graphStep', { step: 'build', state: 'stop' })
  request('stale')
  request('complete')
  await setTimeout(50)
  t.match(out, 'resolving dependencies ✓')
  t.match(out, '2 cache hits')
  request('store')
  request('store')
  await setTimeout(50)
  t.match(out, '4 cache hits', 'store links count as cache hits')
  t.notMatch(out, 'store')
  await r.done(
    {
      buildQueue: [joinDepIDTuple(['registry', '', 'a@1.0.0'])],
      persistedConfig: {
        which: 'project',
        values: { registries: { loc: 'http://u:t@loc/' } },
      },
      migratedWorkspaces: {
        source: 'pnpm-workspace.yaml',
        workspaces: ['packages/*'],
      },
    } as unknown as InstallResult,
    { time: 5 },
  )
  await setTimeout(50)
  t.match(out, 'Done in 5ms')
  t.match(out, '1 packages have install scripts')
  t.match(
    out,
    'Saved registries.loc=http://***@loc/ to project vlt.json',
  )
  t.match(
    out,
    'Saved workspaces from pnpm-workspace.yaml to vlt.json',
  )
  r.error(new Error('x'))
})

t.test('no start, no persisted config', async t => {
  const r = reporter()
  t.equal(await r.done({} as InstallResult, { time: 1 }), undefined)
  r.error(new Error('x'))
})

t.test('a non-TTY stdout is given a width before render', async t => {
  // without one, Ink spawns tput on every render
  const real = process.stdout as unknown as {
    isTTY?: boolean
    columns?: number
  }
  const prev = {
    isTTY: real.isTTY,
    columns: real.columns,
    COLUMNS: process.env.COLUMNS,
  }
  t.teardown(() => {
    real.isTTY = prev.isTTY
    real.columns = prev.columns
    if (prev.COLUMNS === undefined) delete process.env.COLUMNS
    else process.env.COLUMNS = prev.COLUMNS
  })
  const start = () => {
    const r = reporter()
    r.start()
    r.error(new Error('x'))
  }

  real.isTTY = false
  real.columns = undefined
  delete process.env.COLUMNS
  start()
  t.equal(
    real.columns,
    80,
    "Ink's own fallback, so output is unchanged",
  )

  real.columns = undefined
  process.env.COLUMNS = '120'
  start()
  t.equal(real.columns, 120, 'COLUMNS in the environment wins')

  real.columns = 33
  start()
  t.equal(real.columns, 33, 'a width already present is left alone')

  real.isTTY = true
  real.columns = undefined
  start()
  t.equal(real.columns, undefined, 'a real terminal is left alone')
})
