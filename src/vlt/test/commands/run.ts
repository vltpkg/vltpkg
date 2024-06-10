// just a stub for now
import { LoadedConfig } from '@vltpkg/config'
import t from 'tap'

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/run.js')
>('../../src/commands/run.js')
t.type(usage, 'string')
t.capture(console, 'log')
t.capture(console, 'error')
command({ positionals: [] } as unknown as LoadedConfig)
