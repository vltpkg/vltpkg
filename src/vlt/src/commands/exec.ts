import { exec, execFG } from '@vltpkg/run'
import { ExecCommand, ExecResult } from '../exec-command.js'
import { commandUsage } from '../config/usage.js'
import { CliCommandUsage, type CliCommandFn } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'exec',
    usage: '[command]',
    description: `Runs the command with all installed bins in the $PATH
                  If no command specified, an interactive subshell is spawned.`,
  })

export const command: CliCommandFn<ExecResult> = async conf => {
  return {
    result: await new ExecCommand(conf, exec, execFG).run(),
  }
}
