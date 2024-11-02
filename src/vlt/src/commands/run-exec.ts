import { runExec, runExecFG } from '@vltpkg/run'
import { LoadedConfig } from '../config/index.js'
import { ExecCommand } from '../exec-command.js'
import { commandUsage } from '../config/usage.js'
import { type CliCommand } from '../types.js'

export const usage: CliCommand['usage'] = () =>
  commandUsage({
    command: 'run-exec',
    usage: '[command ...]',
    description: `Runs 'vlt run' if the command is a named script, 'vlt exec' otherwise`,
  })

export const command = async (conf: LoadedConfig) =>
  await new ExecCommand(conf, runExec, runExecFG).run()
