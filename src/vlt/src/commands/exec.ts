import { exec, execFG } from '@vltpkg/run'
import { commandUsage } from '../config/usage.ts'
import { ExecCommand } from '../exec-command.ts'
import type { ExecResult } from '../exec-command.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'exec',
    usage: '[command]',
    description: `Run an arbitrary command, with the local installed packages
                  first in the PATH. Ie, this will run your locally installed
                  package bins.

                  If no command is provided, then a shell is spawned in the
                  current working directory, with the locally installed package
                  bins first in the PATH.

                  Note that any vlt configs must be specified *before* the
                  command, as the remainder of the command line options are
                  provided to the exec process.`,
  })

export const command: CommandFn<ExecResult> = async conf => {
  return await new ExecCommand(conf, exec, execFG).run()
}
