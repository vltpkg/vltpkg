import { run, runFG } from '@vltpkg/run'
import type { Monorepo } from '@vltpkg/workspaces'
import type { LoadedConfig } from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import type {
  ExecResult,
  MultiScriptSet,
  ScriptSet,
} from '../exec-command.ts'
import { ExecCommand } from '../exec-command.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export { views } from '../exec-command.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'run',
    usage: '<script> [args ...]',
    description: `Run a script defined in 'package.json', passing along any extra
                  arguments. Note that vlt config values must be specified *before*
                  the script name, because everything after that is handed off to
                  the script process.`,
  })

class RunCommand extends ExecCommand<typeof run, typeof runFG> {
  constructor(conf: LoadedConfig) {
    super(conf, run, runFG)
  }

  // do not provide the interactive shell arg, just do nothing
  // so that it falls back up to the noArgsSingle() method
  defaultArg0(): undefined {}

  noArgsSingle(): ScriptSet {
    // called when there's no arg0, with a single workspace or root
    const ws = this.monorepo?.values().next().value
    const cwd = ws?.fullpath ?? this.projectRoot
    const { scripts = {} } = this.conf.options.packageJson.read(cwd)
    return scripts
  }

  noArgsMulti(this: this & { monorepo: Monorepo }): MultiScriptSet {
    const scriptSet: MultiScriptSet = {}
    for (const [ws, scripts] of this.monorepo.runSync(
      ({ manifest: { scripts } }) => scripts,
    )) {
      if (scripts) scriptSet[ws.path] = scripts
    }
    return scriptSet
  }
}

export const command: CommandFn<ExecResult> = async conf =>
  await new RunCommand(conf).run()
