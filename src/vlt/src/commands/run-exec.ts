import { runExec, runExecFG } from '@vltpkg/run'
import { LoadedConfig } from '../config/index.js'
import { ExecCommand } from '../exec-command.js'

export const usage = `vlt run-exec [command ...]
Runs 'vlt run' if the command is a named script, 'vlt exec' otherwise`

export const command = async (conf: LoadedConfig) =>
  await new ExecCommand(conf, runExec, runExecFG).run()
