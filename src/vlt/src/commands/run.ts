import { PackageJson } from '@vltpkg/package-json'
import { run, runFG, type RunResult } from '@vltpkg/run'
import { type LoadedConfig } from '../config/index.js'
import { ExecCommand, type ExecResult } from '../exec-command.js'
import { commandUsage } from '../config/usage.js'
import {
  type CliCommandUsage,
  type CliCommandFn,
  type CliCommandView,
} from '../types.js'
import { stdout } from '../output.js'
import assert from 'assert'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'run',
    usage: '<script> [args ...]',
    description: `Run a script defined in 'package.json', passing along any extra
                  arguments. Note that vlt config values must be specified *before*
                  the script name, because everything after that is handed off to
                  the script process.`,
  })

export const view: CliCommandView = {
  human: () => {
    let res = 'Scripts available:'
    res += ''

    return res
  },
}

class RunCommand extends ExecCommand<typeof run, typeof runFG> {
  constructor(conf: LoadedConfig) {
    super(conf, run, runFG)
  }

  defaultArg0(): undefined {
    // called when there's no arg0, with a single workspace or root
    const ws = this.monorepo?.values().next().value
    const cwd = ws?.fullpath ?? this.projectRoot
    const packageJson =
      this.monorepo?.packageJson ?? new PackageJson()
    const mani = packageJson.read(cwd)
    stdout('Scripts available:', mani.scripts)
    return undefined
  }

  override noArgsMulti() {
    const m = this.monorepo
    assert(m)

    stdout('Scripts available:')
    for (const [ws, scripts] of m.runSync(
      ws => ws.manifest.scripts,
    )) {
      stdout(ws.path, scripts)
    }

    return {
      x: 'ok',
    }
  }
}

export const command: CliCommandFn<ExecResult> = async conf => {
  return {
    result: await new RunCommand(conf).run(),
  }
}
