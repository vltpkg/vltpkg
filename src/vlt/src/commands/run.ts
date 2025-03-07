import { PackageJson } from '@vltpkg/package-json'
import { run, runFG } from '@vltpkg/run'
import type { LoadedConfig } from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import { ExecCommand } from '../exec-command.ts'
import type { ExecResult } from '../exec-command.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { stdout } from '../output.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'run',
    usage: '<script> [args ...]',
    description: `Run a script defined in 'package.json', passing along any extra
                  arguments. Note that vlt config values must be specified *before*
                  the script name, because everything after that is handed off to
                  the script process.`,
  })

export const views: Views<ExecResult> = {
  json: g => g,
  human: (res, _, conf) => {
    if (conf.positionals.length === 0) {
      return `Scripts available:\n  ${Object.entries(res ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n  ')}`
    }
  },
}

class RunCommand extends ExecCommand<typeof run, typeof runFG> {
  constructor(conf: LoadedConfig) {
    super(conf, run, runFG)
  }

  defaultArg0(): string | undefined {
    // called when there's no arg0, with a single workspace or root
    const ws = this.monorepo?.values().next().value
    const cwd = ws?.fullpath ?? this.projectRoot
    const packageJson =
      this.monorepo?.packageJson ?? new PackageJson()
    const mani = packageJson.read(cwd)
    return mani.scripts
    // stdout('Scripts available:', mani.scripts)
    // return undefined
  }

  noArgsMulti(): void {
    const m = this.monorepo
    /* c8 ignore next - already guarded */
    if (!m) return

    stdout('Scripts available:')
    for (const [ws, scripts] of m.runSync(
      ws => ws.manifest.scripts,
    )) {
      stdout(ws.path, scripts)
    }
  }
}

export const command: CommandFn<ExecResult> = async conf => {
  if (conf.positionals.length === 0) {
    const ws = conf.options.monorepo?.values().next().value
    const cwd = ws?.fullpath ?? conf.projectRoot
    const packageJson =
      conf.options.monorepo?.packageJson ?? new PackageJson()
    const mani = packageJson.read(cwd)
    return mani.scripts
  }
  return new RunCommand(conf).run()
}
