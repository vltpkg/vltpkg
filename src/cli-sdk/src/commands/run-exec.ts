import { runExec, runExecFG } from '@vltpkg/run'
import { commandUsage } from '../config/usage.ts'
import type { ExecResult } from '../exec-command.ts'
import { ExecCommand } from '../exec-command.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
export { views } from '../exec-command.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'run-exec',
    usage: '[command ...]',
    description: `If the first argument is a defined script in package.json, then this is
                  equivalent to \`vlt run\`.

                  If not, then this is equivalent to \`vlt exec\`.`,
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
      'script-shell': {
        value: '<program>',
        description:
          'Shell to use when executing package.json scripts.',
      },
    },
  })

export const command: CommandFn<ExecResult> = async conf =>
  await new ExecCommand(conf, runExec, runExecFG).run()
