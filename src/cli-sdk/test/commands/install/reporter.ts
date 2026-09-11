import { emitter } from '@vltpkg/output'
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

t.test('steps, requests and trailer', async t => {
  const r = reporter()
  r.start()
  await setTimeout(50)
  t.match(out, 'resolving dependencies')
  emitter.emit('graphStep', { step: 'build', state: 'start' })
  emitter.emit('request', { state: 'start' } as any)
  await setTimeout(50)
  t.match(out, /1 request$/m)
  emitter.emit('request', { state: 'start' } as any)
  emitter.emit('request', { state: 'cache' } as any)
  await setTimeout(50)
  t.match(out, '2 requests')
  t.match(out, '1 cache hit')
  emitter.emit('graphStep', { step: 'build', state: 'stop' })
  emitter.emit('request', { state: 'stale' } as any)
  emitter.emit('request', { state: 'end' } as any)
  await setTimeout(50)
  t.match(out, 'resolving dependencies ✓')
  t.match(out, '2 cache hits')
  await r.done(
    {
      buildQueue: ['a' as any],
      persistedConfig: {
        which: 'project',
        values: { registries: { loc: 'http://loc/' } },
      },
    } as unknown as InstallResult,
    { time: 5 },
  )
  await setTimeout(50)
  t.match(out, 'Done in 5ms')
  t.match(out, '1 packages have install scripts')
  t.match(out, 'Saved registries.loc=http://loc/ to project vlt.json')
  r.error(new Error('x'))
})

t.test('no start, no persisted config', async t => {
  const r = reporter()
  t.equal(await r.done({} as InstallResult, { time: 1 }), undefined)
  r.error(new Error('x'))
})
