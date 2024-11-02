import { PackageJson } from '@vltpkg/package-json'
import { run, runFG } from '@vltpkg/run'
import { LoadedConfig } from '../config/index.js'
import { ExecCommand, ExecResult } from '../exec-command.js'
import { commandUsage } from '../config/usage.js'
import { type CliCommandUsage, CliCommandFn } from '../types.js'
import { stdout } from '../output.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'run',
    usage: '<script> [args ...]',
    description: `Run the named script from package.json`,
  })

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
    stdout('Scripts available:', mani.scripts)
    return undefined
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

export const command: CliCommandFn<ExecResult> = async conf => {
  return {
    result: await new RunCommand(conf).run(),
  }
}
