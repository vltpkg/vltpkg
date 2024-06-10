// just a stub for now
import { LoadedConfig } from '@vltpkg/config'
import t from 'tap'

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/help.js')
>('../../src/commands/help.js')
t.type(usage, 'string')
t.capture(console, 'log')
t.capture(console, 'error')
command({ positionals: [] } as unknown as LoadedConfig)
