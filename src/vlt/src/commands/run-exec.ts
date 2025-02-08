import { runExec, runExecFG } from '@vltpkg/run'
import { ExecCommand, type ExecResult } from '../exec-command.ts'
import { commandUsage } from '../config/usage.ts'
import {
  type CommandUsage,
  type CommandFnResultOnly,
} from '../types.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'run-exec',
    usage: '[command ...]',
    description: `If the first argument is a defined script in package.json, then this is
                  equivalent to \`vlt run\`.

                  If not, then this is equivalent to \`vlt exec\`.`,
  })

export const command: CommandFnResultOnly<
  ExecResult
> = async conf => {
  return {
    result: await new ExecCommand(conf, runExec, runExecFG).run(),
  }
}
