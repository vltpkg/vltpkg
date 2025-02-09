import t from 'tap'
import './commands/exec.ts'
import './commands/run-exec.ts'
import './commands/run.ts'

import { exec, execFG } from '@vltpkg/run'
import { type LoadedConfig } from '../src/config/index.ts'
import { ExecCommand } from '../src/exec-command.ts'

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
