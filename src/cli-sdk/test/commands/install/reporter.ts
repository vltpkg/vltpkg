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
  r.error(new Error('x'))
})

t.test('no start, no persisted config', async t => {
  const r = reporter()
  t.equal(await r.done({} as InstallResult, { time: 1 }), undefined)
  r.error(new Error('x'))
})

t.test('global', async t => {
  const r = reporter()
  r.start()
  await r.done(
    {
      buildQueue: [joinDepIDTuple(['registry', '', 'a@1.0.0'])],
      global: {
        binDir: '/g/bin',
        bins: ['a', 'b'],
        conflicts: ['c'],
        inPath: false,
      },
    } as unknown as InstallResult,
    { time: 5 },
  )
  await setTimeout(50)
  t.match(out, 'vlt query -g :scripts')
  t.match(out, 'vlt build -g')
  t.match(out, 'Linked a, b in /g/bin')
  t.match(out, 'Skipped c: already linked by another global package')
  t.match(out, 'Add /g/bin to your PATH')
  r.error(new Error('x'))

  const r2 = reporter()
  r2.start()
  await r2.done(
    {
      global: {
        binDir: '/g/bin',
        bins: [],
        conflicts: [],
        inPath: true,
      },
    } as unknown as InstallResult,
    { time: 6 },
  )
  await setTimeout(50)
  t.match(out, 'Done in 6ms')
  t.notMatch(out, 'Linked')
  t.notMatch(out, 'Skipped')
  t.notMatch(out, 'PATH')
  r2.error(new Error('x'))

  // PATH hint only when there are bins
  for (const [conflicts, hint] of [
    [[], false],
    [['c'], true],
  ] as const) {
    const r = reporter()
    r.start()
    await r.done(
      {
        global: {
          binDir: '/g/bin',
          bins: [],
          conflicts,
          inPath: false,
        },
      } as unknown as InstallResult,
      { time: 7 },
    )
    await setTimeout(50)
    t.match(out, 'Done in 7ms')
    t.equal(out.includes('PATH'), hint, `hint: ${hint}`)
    r.error(new Error('x'))
  }
})
