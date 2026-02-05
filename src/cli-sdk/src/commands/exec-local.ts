import { exec, execFG } from '@vltpkg/run'
import { commandUsage } from '../config/usage.ts'
import type { ExecResult } from '../exec-command.ts'
import { ExecCommand } from '../exec-command.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
export { views } from '../exec-command.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'exec-local',
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
    options: {
      scope: {
        value: '<query>',
        description: 'Filter execution targets using a DSS query.',
      },
      workspace: {
        value: '<path|glob>',
        description:
          'Limit execution to matching workspace paths or globs.',
      },
      'workspace-group': {
        value: '<name>',
        description: 'Limit execution to named workspace groups.',
      },
      recursive: {
        description: 'Run across all selected workspaces.',
      },
      'if-present': {
        description:
          'When running across multiple packages, only include packages with matching scripts.',
      },
      bail: {
        description:
          'When running across multiple workspaces, stop on first failure.',
      },
    },
  })

export const command: CommandFn<ExecResult> = async conf => {
  delete conf.options['script-shell']
  return await new ExecCommand(conf, exec, execFG).run()
}
