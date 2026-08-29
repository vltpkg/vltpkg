// 3c dark test harness: the shipped perry/tui install reporter, driven by the
// same `@vltpkg/output` events an install emits. Imported by relative path —
// this directory is not a workspace.
import { emitter } from '../../../../src/output/src/index.ts'
import { InstallReporter } from '../../../../src/cli-sdk/src/commands/install/reporter-tui.ts'
import type { LoadedConfig } from '../../../../src/cli-sdk/src/config/index.ts'
import type { InstallResult } from '../../../../src/cli-sdk/src/commands/install.ts'

const reporter = new InstallReporter({}, {
  values: { view: 'human' },
} as unknown as LoadedConfig)

reporter.start()
emitter.emit('graphStep', { step: 'build', state: 'start' })
emitter.emit('request', {
  state: 'start',
  url: 'https://example.com/a',
})
emitter.emit('request', {
  state: 'start',
  url: 'https://example.com/b',
})
emitter.emit('request', {
  state: 'cache',
  url: 'https://example.com/c',
})
emitter.emit('graphStep', { step: 'build', state: 'stop' })
emitter.emit('graphStep', { step: 'reify', state: 'start' })
await new Promise(r => setTimeout(r, 250))
emitter.emit('graphStep', { step: 'reify', state: 'stop' })

await reporter.done({ buildQueue: [] } as unknown as InstallResult, {
  time: 1234,
})
