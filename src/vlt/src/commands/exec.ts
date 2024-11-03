import { exec, execFG } from '@vltpkg/run'
import { ExecCommand, ExecResult } from '../exec-command.js'
import { commandUsage } from '../config/usage.js'
import { CliCommandUsage, type CliCommandFn } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'exec',
    usage: '[command]',
    description: `Run an arbitrary command, with the local installed packages first in the
                  PATH. Ie, this will run your locally installed package bins.

                  If no command is provided, then a shell is spawned in the current working
                  directory, with the locally installed package bins first in the PATH.

                  Note that any vlt configs must be specified *before* the command,
                  as the remainder of the command line options are provided to the exec
                  process.`,
  })

export const command: CliCommandFn<ExecResult> = async conf => {
  return {
    result: await new ExecCommand(conf, exec, execFG).run(),
  }
}
