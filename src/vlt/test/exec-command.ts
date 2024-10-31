import t from 'tap'
import './commands/exec.js'
import './commands/run-exec.js'
import './commands/run.js'

import { exec, execFG } from '@vltpkg/run'
import { type LoadedConfig } from '../src/config/index.js'
import { ExecCommand } from '../src/exec-command.js'

const e = new ExecCommand(
  {
    projectRoot: t.testdirName,
    positionals: [],
    get() {},
  } as unknown as LoadedConfig,
  exec,
  execFG,
)

t.equal(e.defaultArg0(), e.interactiveShell())
t.equal(e.fgArg()?.['script-shell'], false)
t.throws(() => e.noArgsMulti())
