import { runExec, runExecFG } from '@vltpkg/run'
import { commandUsage } from '../config/usage.ts'
import { ExecCommand, type ExecResult } from '../exec-command.ts'
import { type CommandFn, type CommandUsage } from '../index.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'run-exec',
    usage: '[command ...]',
    description: `If the first argument is a defined script in package.json, then this is
                  equivalent to \`vlt run\`.

                  If not, then this is equivalent to \`vlt exec\`.`,
  })

export const command: CommandFn<ExecResult> = async conf =>
  await new ExecCommand(conf, runExec, runExecFG).run()
