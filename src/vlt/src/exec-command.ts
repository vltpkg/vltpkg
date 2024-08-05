/**
 * Implementation shared between `vlt run`, `vlt run-exec`, and `vlt exec`
 */

import { error } from '@vltpkg/error-cause'
import type {
  exec,
  execFG,
  ExecOptions,
  run,
  runExec,
  runExecFG,
  RunExecOptions,
  runFG,
  RunOptions,
  RunResult,
} from '@vltpkg/run'
import { Monorepo, Workspace } from '@vltpkg/workspaces'
import { ansiToAnsi } from 'ansi-to-pre'
import chalk from 'chalk'
import { LoadedConfig } from './config/index.js'

export type RunnerBG = typeof run | typeof runExec | typeof exec
export type RunnerFG = typeof runFG | typeof runExecFG | typeof execFG
export type RunnerOptions = RunOptions & ExecOptions & RunExecOptions

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

  constructor(conf: LoadedConfig, bg: B, fg: F) {
    this.conf = conf
    this.bg = bg
    this.fg = fg
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

  async run() {
    if (this.spaces === 1) {
      const arg = this.fgArg()
      if (!arg) return
      const result = await this.fg(arg)
      console.log(result)
      return result
    }
    const m = this.monorepo
    if (!m || this.spaces === 0) {
      throw error('no matching workspaces found', {
        /* c8 ignore next - already guarded */
        validOptions: [...(this.monorepo?.load().paths() ?? [])],
      })
    }
    const arg0 = this.arg0
    if (!arg0) {
      this.noArgsMulti()
      return
    }
    // run across workspaces
    let failed = false
    const resultMap = await m.run(async ws => {
      if (!failed) console.error(`${ws.path} ${arg0}`)
      const result = await this.bg(this.bgArg(ws)).catch(
        (er: Error & { cause: RunResult }) => {
          this.printResult(ws, er.cause)
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
    //console.log(results)
    return results
  }

  printResult(ws: Workspace, result: RunResult) {
    if (result.status === 0 && result.signal === null) {
      console.log(ws.path, 'ok')
    } else {
      console.log(
        chalk.bgWhiteBright.black.bold(ws.path + ' failure'),
        {
          status: result.status,
          signal: result.signal,
        },
      )
      /* c8 ignore start */
      if (result.stderr) console.error(ansiToAnsi(result.stderr))
      if (result.stdout) console.log(ansiToAnsi(result.stdout))
      process.exitCode = process.exitCode || (result.status ?? 1)
      /* c8 ignore stop */
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

  // overridden by 'vlt run' to print options and return undefined
  defaultArg0(): string | undefined {
    return this.interactiveShell()
  }

  fgArg(): RunnerOptions | undefined {
    const cwd =
      this.monorepo?.values().next().value.fullpath ??
      this.projectRoot
    const arg0 = this.arg0 ?? this.defaultArg0()
    if (!arg0) {
      return undefined
    }

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

  /** If this returns undefined, then nothing to do */
  bgArg(ws: Workspace): RunnerOptions {
    /* c8 ignore start - already guarded */
    if (!this.arg0)
      throw error(
        'Cannot spawn interactive shells in multiple workspaces',
      )
    /* c8 ignore stop */

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

  // overridden in `vlt run` to print available scripts
  noArgsMulti() {
    throw error(
      'Cannot spawn interactive shells in multiple workspaces',
    )
  }
}
