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
  t.notMatch(out, 'linked from store')
  request('store')
  request('store')
  await setTimeout(50)
  t.match(out, '2 linked from store')
  t.match(out, '2 cache hits', 'not counted as cache hits')
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
