import { runExec, runExecFG } from '@vltpkg/run'
import { ExecCommand, type ExecResult } from '../exec-command.js'
import { commandUsage } from '../config/usage.js'
import {
  type CommandUsage,
  type CommandFnResultOnly,
} from '../types.js'

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
