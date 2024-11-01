import { PackageJson } from '@vltpkg/package-json'
import { run, runFG } from '@vltpkg/run'
import { LoadedConfig } from '../config/index.js'
import { ExecCommand } from '../exec-command.js'
import { commandUsage } from '../config/usage.js'
import { type CliCommand } from '../types.js'

export const usage: CliCommand['usage'] = () =>
  commandUsage({
    command: 'run',
    usage: '<script> [args ...]',
    description: `Run the named script from package.json`,
  })

class RunCommand extends ExecCommand<typeof run, typeof runFG> {
  constructor(conf: LoadedConfig, bg = run, fg = runFG) {
    super(conf, bg, fg)
  }

  defaultArg0(): string | undefined {
    // called when there's no arg0, with a single workspace or root
    const ws = this.monorepo?.values().next().value
    const cwd = ws?.fullpath ?? this.projectRoot
    const packageJson =
      this.monorepo?.packageJson ?? new PackageJson()
    const mani = packageJson.read(cwd)
    console.log('Scripts available:', mani.scripts)
    return undefined
  }

  noArgsMulti(): void {
    const m = this.monorepo
    /* c8 ignore next - already guarded */
    if (!m) return

    console.log('Scripts available:')
    for (const [ws, scripts] of m.runSync(
      ws => ws.manifest.scripts,
    )) {
      console.log(ws.path, scripts)
    }
  }
}

export const command = async (conf: LoadedConfig) =>
  await new RunCommand(conf).run()
