// just a stub for now
import t from 'tap'
import { LoadedConfig } from '../../src/config/index.js'

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/install-exec.js')
>('../../src/commands/install-exec.js')
t.type(usage, 'string')
t.capture(console, 'log')
t.capture(console, 'error')
await command({ positionals: [] } as unknown as LoadedConfig)
