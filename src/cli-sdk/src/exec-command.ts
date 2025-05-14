/**
 * impl for `vlt run`, `vlt run-exec`, `vlt exec-local`, `vlt exec`
 * @module
 */

import { error } from '@vltpkg/error-cause'
import { isErrorWithCause } from '@vltpkg/types'
import type {
  exec,
  execFG,
  ExecOptions,
  run,
  runExec,
  runExecFG,
  RunExecOptions,
  runFG,
  RunFGResult,
  RunOptions,
  RunResult,
} from '@vltpkg/run'
import { isRunResult } from '@vltpkg/run'
import type { Workspace } from '@vltpkg/workspaces'
import { Monorepo } from '@vltpkg/workspaces'
import { ansiToAnsi } from 'ansi-to-pre'
import type { LoadedConfig } from './config/index.ts'
import { stderr, stdout, styleTextStdout } from './output.ts'
import type { Views } from './view.ts'

export type RunnerBG = typeof exec | typeof run | typeof runExec
export type RunnerFG = typeof execFG | typeof runExecFG | typeof runFG
export type RunnerOptions = ExecOptions & RunExecOptions & RunOptions
export type MultiRunResult = Record<string, RunResult>
export type ScriptSet = Record<string, string>
export type MultiScriptSet = Record<string, ScriptSet>
export type ExecResult =
  | RunFGResult
  | MultiRunResult
  | ScriptSet
  | MultiScriptSet

const isScriptSet = (o: unknown): o is ScriptSet => {
  if (!o || typeof o !== 'object') return false
  for (const v of Object.values(o)) {
    if (typeof v !== 'string') return false
  }
  return true
}

const isMultiScriptSet = (
  o: ExecResult,
): o is Record<string, ScriptSet> => {
  for (const v of Object.values(o)) {
    if (!isScriptSet(v)) return false
  }
  return true
}

const isSingleSuccess = (
  o: RunResult,
): o is RunResult & { status: 0; signal: null } =>
  o.signal === null && o.status === 0

const setExitCode = (result: RunResult) => {
  /* c8 ignore next */
  process.exitCode = process.exitCode || (result.status ?? 1)
}

export const views = {
  // run results for single or multiple will be printed along the way.
  human: result => {
    if (isScriptSet(result)) stdout('Scripts available:', result)
    else if (isMultiScriptSet(result)) {
      stdout('Scripts available:')
      for (const [wsPath, scripts] of Object.entries(result)) {
        stdout(wsPath, scripts)
      }
    }
  },
  json: result =>
    isRunResult(result) && isSingleSuccess(result) ?
      undefined
    : result,
} as const satisfies Views<ExecResult>

export class ExecCommand<B extends RunnerBG, F extends RunnerFG> {
  bg: B
  fg: F
  arg0?: string
  args: string[]
  monorepo?: Monorepo
  /** how many places are we doing things in? */
  spaces: number
  conf: LoadedConfig
  projectRoot: string
  view: 'human' | 'json' | 'inspect'

  constructor(conf: LoadedConfig, bg: B, fg: F) {
    this.conf = conf
    this.bg = bg
    this.fg = fg
    this.view =
      conf.values.view === 'json' ? 'json'
      : conf.values.view === 'inspect' ? 'inspect'
      : 'human'
    const {
      projectRoot,
      positionals: [arg0, ...args],
    } = conf
    this.arg0 = arg0
    this.args = args

    const paths = conf.get('workspace')
    const groups = conf.get('workspace-group')
    const recursive = conf.get('recursive')
    this.monorepo =
      paths?.length || groups?.length || recursive ?
        Monorepo.load(projectRoot, { load: { paths, groups } })
      : undefined
    this.spaces = this.monorepo?.size ?? 1
    this.projectRoot = projectRoot
  }

  hasMonorepo(): this is this & { monorepo: Monorepo } {
    return !!this.monorepo
  }

  hasArg0(): this is this & { arg0: string } {
    return !!this.arg0
  }

  async run(): Promise<ExecResult> {
    if (this.spaces === 1) {
      const arg = this.fgArg()
      if (!arg) return this.noArgsSingle()
      const result = await this.fg(arg)
      if (isRunResult(result)) {
        setExitCode(result)
      }
      return result
    }
    if (!this.hasMonorepo() || this.spaces === 0) {
      throw error('no matching workspaces found', {
        /* c8 ignore next - already guarded */
        validOptions: [...(this.monorepo?.load().paths() ?? [])],
      })
    }

    if (!this.hasArg0()) {
      return this.noArgsMulti()
    }

    // run across workspaces
    let failed = false
    const resultMap = await this.monorepo.run(async ws => {
      const result = await this.bg(this.bgArg(ws)).catch(
        (er: unknown) => {
          if (isErrorWithCause(er) && isRunResult(er.cause)) {
            this.printResult(ws, er.cause)
          }
          failed = true
          throw er
        },
      )
      if (!failed) this.printResult(ws, result)
      return result
    })

    const results: Record<string, RunResult> = {}
    for (const [ws, result] of resultMap) {
      if (result.status === 0 && result.signal === null) {
        result.stdout = ''
        result.stderr = ''
      }
      results[ws.path] = result
    }
    return results
  }

  printResult(ws: Workspace, result: RunResult) {
    // non-human results just get printed at the end
    if (this.view !== 'human') return

    if (result.status === 0 && result.signal === null) {
      stdout(ws.path, 'ok')
    } else {
      stdout(
        styleTextStdout(
          ['bgWhiteBright', 'black', 'bold'],
          ws.path + ' failure',
        ),
        {
          status: result.status,
          signal: result.signal,
        },
      )
      /* c8 ignore start */
      if (result.stderr) stderr(ansiToAnsi(result.stderr))
      if (result.stdout) stdout(ansiToAnsi(result.stdout))
      /* c8 ignore stop */
      setExitCode(result)
    }
  }

  /* c8 ignore start - env specific */
  interactiveShell(): string {
    return (
      process.env.SHELL ??
      this.conf.get('script-shell') ??
      (process.platform === 'win32' ? 'cmd.exe' : '/bin/sh')
    )
  }
  /* c8 ignore stop */

  // overridden by 'vlt run' which returns undefined
  defaultArg0(): string | undefined {
    return this.interactiveShell()
  }

  fgArg(): RunnerOptions | undefined {
    const ws = this.monorepo?.values().next().value
    const cwd = ws?.fullpath ?? this.projectRoot
    const arg0 = this.arg0 ?? this.defaultArg0()

    // return undefined so noArgsSingle will be called instead
    if (typeof arg0 !== 'string') return

    return {
      cwd,
      /* c8 ignore next - already guarded */
      arg0,
      args: this.args,
      projectRoot: this.projectRoot,
      packageJson: this.monorepo?.packageJson,
      'script-shell':
        this.arg0 ? this.conf.get('script-shell') : false,
    }
  }

  bgArg(this: this & { arg0: string }, ws: Workspace): RunnerOptions {
    return {
      cwd: ws.fullpath,
      acceptFail: !this.conf.get('bail'),
      ignoreMissing: true,
      arg0: this.arg0,
      args: this.args,
      projectRoot: this.projectRoot,
      packageJson: this.monorepo?.packageJson,
      'script-shell': this.conf.get('script-shell'),
    }
  }

  /* c8 ignore start - not used, only here to override */
  noArgsSingle(): ScriptSet {
    throw error('Failed to determine interactive shell to spawn')
  }
  /* c8 ignore stop - not used, only here to override */

  noArgsMulti(this: this & { monorepo: Monorepo }): MultiScriptSet {
    throw error(
      'Cannot spawn interactive shells in multiple workspaces',
    )
  }
}
