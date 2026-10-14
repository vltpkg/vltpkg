import { joinDepIDTuple } from '@vltpkg/dep-id'
import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import * as ink from 'ink'
import { PassThrough } from 'node:stream'
import { setTimeout } from 'node:timers/promises'
import t from 'tap'
import type { InstallResult } from '../../../src/commands/install.ts'
import type { LoadedConfig } from '../../../src/config/index.ts'
import type { GlobalBins } from '../../../src/global.ts'
import type { SelfUpdate } from '../../../src/self-update.ts'
import type { OfferOptions } from '../../../src/shell-setup/index.ts'

let out = ''
const stdout = Object.assign(new PassThrough(), { columns: 200 })
stdout.on('data', (c: Buffer) => (out = c.toString()))

const offers: [unknown, OfferOptions][] = []
let onOffer = (_o: OfferOptions) => {}

const { InstallReporter } = await t.mockImport<
  typeof import('../../../src/commands/install/reporter.ts')
>('../../../src/commands/install/reporter.ts', {
  '../../../src/shell-setup/index.ts': {
    ...(await import('../../../src/shell-setup/index.ts')),
    offerPathSetup: async (g: unknown, o: OfferOptions) => {
      offers.push([g, o])
      onOffer(o)
    },
  },
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

const reporter = (vals: Record<string, unknown> = {}) =>
  new InstallReporter({}, {
    projectRoot: '/g',
    get: (k: string) => vals[k],
  } as unknown as LoadedConfig)
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
  t.equal(await r.done({}, { time: 1 }), undefined)
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
        source: 'global-dir',
        otherDirs: [],
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
  t.match(out, 'Skipped c: already in /g/bin')
  t.match(out, '/g/bin is not on your PATH, so a, b')
  r.error(new Error('x'))

  const r2 = reporter()
  r2.start()
  await r2.done(
    {
      global: {
        binDir: '/g/bin',
        source: 'global-dir',
        otherDirs: [],
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
          source: 'global-dir',
          otherDirs: [],
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

t.test('PATH offer', async t => {
  offers.length = 0
  t.teardown(() => {
    onOffer = () => {}
  })
  const global = {
    binDir: '/g/bin',
    source: 'global-dir',
    otherDirs: [],
    bins: ['a'],
    conflicts: [],
    inPath: false,
  }
  const r = reporter({ yes: true, 'no-modify-path': false })
  r.start()
  // ink in CI writes only a newline on unmount in debug mode
  let frame = ''
  onOffer = o => {
    frame = out
    o.beforeOutput?.()
  }
  await r.done({ global } as unknown as InstallResult, { time: 8 })
  t.match(offers, [
    [global, { globalDir: '/g', yes: true, noModifyPath: false }],
  ])
  t.match(frame, 'Done in 8ms', 'final frame drawn before the offer')
  t.match(frame, '/g/bin is not on your PATH')
  r.error(new Error('x'))

  offers.length = 0
  const r2 = reporter({ 'no-modify-path': true })
  await r2.done({ global } as unknown as InstallResult, { time: 9 })
  t.match(offers, [[global, { yes: false, noModifyPath: true }]])
  offers[0]?.[1].beforeOutput?.()
  r2.error(new Error('x'))

  offers.length = 0
  await reporter().done({}, { time: 1 })
  t.strictSame(offers, [], 'not global')
})

t.test('vlt install -g vlt', async t => {
  const conf = {
    command: 'install',
    globalRoot: '/g',
    projectRoot: '/g',
    positionals: ['vlt'],
    get: () => undefined,
  } as unknown as LoadedConfig
  const self: SelfUpdate = {
    case: 'npm',
    status: 'updated',
    from: '1.0.0',
    to: '1.1.0',
    dir: '/g/bin',
  }
  const global: GlobalBins = {
    binDir: '/g/bin',
    source: 'global-dir',
    otherDirs: [],
    bins: ['vlt'],
    conflicts: [],
    inPath: true,
  }
  const run = async (result: Partial<InstallResult>) => {
    const r = new InstallReporter({}, conf)
    out = ''
    r.start()
    await setTimeout(50)
    t.equal(out, '', 'no live view')
    t.equal(await r.done(result, { time: 5 }), undefined)
    await setTimeout(50)
    // read before unmount: ink in CI writes a newline on unmount
    const o = out
    r.error(new Error('x'))
    return o
  }

  t.test('self only', async t => {
    offers.length = 0
    const o = await run({ self })
    t.match(o, '⬆️  Updated vlt 1.0.0 → 1.1.0 in /g/bin (via npm)')
    t.notMatch(o, 'Done in')
    t.match(
      await run({ self: { ...self, status: 'up-to-date' } }),
      '✅ vlt 1.1.0 is already up to date',
    )
    t.match(
      await run({
        self: { ...self, status: 'newer-running', tag: 'latest' },
      }),
      'ℹ️  vlt 1.0.0 is running but "latest" is 1.1.0; run `vlt i -g vlt@latest` to downgrade',
    )
    t.equal(
      await run({ self: { ...self, status: 'failed' } }),
      '',
      'npm already said why',
    )
    const no = await run({
      self: {
        status: 'refused',
        from: '1.0.0',
        dir: '/b',
        message: 'vlt at /b was installed by Homebrew.',
      },
    })
    t.match(no, 'vlt at /b was installed by Homebrew.')
    t.notMatch(no, 'Done in')
    t.strictSame(offers, [], 'nothing linked: no PATH offer')
  })

  t.test('global-project', async t => {
    const o = await run({
      graph: {} as InstallResult['graph'],
      self: { ...self, case: 'global-project' },
      global,
    })
    t.match(
      o,
      /Done in 5ms\n⬆️ {2}Updated vlt 1\.0\.0 → 1\.1\.0 in \/g\/bin\n🔗 Linked vlt in \/g\/bin/,
    )
    t.notMatch(o, 'via npm')
  })

  t.test('bootstrap', async t => {
    const boot: SelfUpdate = {
      ...self,
      case: 'bootstrap',
      notWritable: '/usr/bin',
    }
    const result = {
      graph: {} as InstallResult['graph'],
      self: boot,
      global: { ...global, notWritable: '/usr/bin' },
    }
    const o = await run(result)
    t.match(
      o,
      'ℹ️  /usr/bin is not writable, so vlt 1.1.0 was installed as a global package.',
    )
    t.notMatch(o, 'Using')
    t.notMatch(o, 'earlier in your PATH')
    t.match(
      await run({
        ...result,
        self: { ...boot, shadowedBy: '/usr/bin' },
      }),
      '⚠️  /usr/bin is earlier in your PATH, so `vlt` still runs vlt 1.0.0.',
    )

    // linked off PATH: offer after the plain frame
    offers.length = 0
    let frame = ''
    onOffer = o => {
      frame = out
      o.beforeOutput?.()
    }
    t.teardown(() => {
      onOffer = () => {}
    })
    const off = { ...result.global, inPath: false }
    await run({ ...result, global: off })
    t.match(offers, [[off, { globalDir: '/g' }]])
    t.match(frame, 'was installed as a global package')
    t.match(frame, '/g/bin is not on your PATH')
  })
})
