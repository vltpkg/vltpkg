import { runExec, runExecFG } from '@vltpkg/run'
import { ExecCommand, ExecResult } from '../exec-command.js'
import { commandUsage } from '../config/usage.js'
import { type CliCommandUsage, CliCommandFn } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'run-exec',
    usage: '[command ...]',
    description: `Runs 'vlt run' if the command is a named script, 'vlt exec' otherwise`,
  })

export const command: CliCommandFn<ExecResult> = async conf => {
  return {
    result: await new ExecCommand(conf, runExec, runExecFG).run(),
  }
}
