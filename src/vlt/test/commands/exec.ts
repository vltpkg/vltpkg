// just a stub for now
import { LoadedConfig } from '../../src/config/index.js'
import t from 'tap'

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/exec.js')
>('../../src/commands/exec.js')
t.type(usage, 'string')
t.capture(console, 'log')
t.capture(console, 'error')
command({ positionals: [] } as unknown as LoadedConfig)
