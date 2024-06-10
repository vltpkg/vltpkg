// just a stub for now
import { LoadedConfig } from '@vltpkg/config'
import t from 'tap'

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/install.js')
>('../../src/commands/install.js')
t.type(usage, 'string')
t.capture(console, 'log')
t.capture(console, 'error')
command({ positionals: [] } as unknown as LoadedConfig)
