/**
 * impl for `vlt run`, `vlt run-exec`, `vlt exec-local`, `vlt exec`
 * @module
 */

import { error } from '@vltpkg/error-cause'
import { isErrorWithCause } from '@vltpkg/types'
import type { NormalizedManifest } from '@vltpkg/types'
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
import { Query } from '@vltpkg/query'
import { actual } from '@vltpkg/graph'
import { isRunResult } from '@vltpkg/run'
import { Monorepo } from '@vltpkg/workspaces'
import { ansiToAnsi } from 'ansi-to-pre'
import type { LoadedConfig } from './config/index.ts'
import { stderr, stdout, styleTextStdout } from './output.ts'
import type { Views } from './view.ts'
import type { SpawnResultStdioStrings } from '@vltpkg/promise-spawn'
import assert from 'node:assert'
import { resolve } from 'node:path'

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

type ViewValues = 'human' | 'json' | 'inspect' | 'silent'

// Removed separate target abstraction; use private helpers on ExecCommand instead.

export class ExecCommand<B extends RunnerBG, F extends RunnerFG> {
  bg: B
  fg: F
  arg0?: string
  args: string[]
  /**
   * Implementation detail: Only one of these will be set based on the user
   * input. They are kept private to force consumers to use shared methods.
   */
  #monorepo?: Monorepo
  #nodes?: string[]
  // no derived container; use private helpers based on #monorepo/#nodeLocations
  conf: LoadedConfig
  projectRoot: string
  view: ViewValues
  validViewValues = new Map<string, ViewValues>([
    ['human', 'human'],
    ['json', 'json'],
    ['inspect', 'inspect'],
    ['silent', 'silent'],
  ])

  constructor(conf: LoadedConfig, bg: B, fg: F) {
    this.conf = conf
    this.bg = bg
    this.fg = fg
    this.view = this.validViewValues.get(conf.values.view) ?? 'human'
    const {
      projectRoot,
      positionals: [arg0, ...args],
    } = conf
    this.arg0 = arg0
    this.args = args
    this.projectRoot = projectRoot
  }

  #targetCount(): number {
    if (this.#nodes) return this.#nodes.length
    return this.#monorepo?.size ?? 1
  }

  hasArg0(): this is this & { arg0: string } {
    return !!this.arg0
  }

  async run(): Promise<ExecResult> {
    const { conf } = this

    const queryString = conf.get('scope')
    // scope takes precedence over workspaces or groups
    if (queryString) {
      const graph = actual.load({
        ...conf.options,
        mainManifest: conf.options.packageJson.read(this.projectRoot),
        monorepo: Monorepo.load(this.projectRoot),
        loadManifests: false,
      })
      const query = new Query({
        graph,
        specOptions: conf.options,
        securityArchive: undefined,
      })
      const { nodes } = await query.search(queryString, {
        signal: new AbortController().signal,
      })
      this.#nodes = []
      for (const node of nodes) {
        const { location } = node.toJSON()
        assert(
          location,
          error(`node ${node.id} has no location`, {
            found: node,
          }),
        )
        this.#nodes.push(location)
      }
    } else {
      const paths = conf.get('workspace')
      const groups = conf.get('workspace-group')
      const recursive = conf.get('recursive')
      this.#monorepo =
        paths?.length || groups?.length || recursive ?
          Monorepo.load(this.projectRoot, {
            load: { paths, groups },
          })
        : undefined
    }

    if (this.#targetCount() === 1) {
      const arg = this.fgArg()
      if (!arg) return this.noArgsSingle()
      const result = await this.fg(arg)
      if (isRunResult(result)) {
        setExitCode(result)
      }
      return result
    }

    if (this.#targetCount() === 0) {
      if (queryString) {
        throw error('no matching nodes found for query', {
          found: queryString,
        })
      } else {
        throw error('no matching workspaces found', {
          /* c8 ignore next - already guarded */
          validOptions: [...(this.#monorepo?.load().paths() ?? [])],
        })
      }
    }

    if (!this.hasArg0()) {
      return this.noArgsMulti()
    }

    // run across workspaces
    let failed = false
    let resultMap: Map<string, SpawnResultStdioStrings> = new Map()
    for (const { label, cwd } of this.iterateTargets()) {
      const result = await this.bg(this.bgArg(cwd)).catch(
        (er: unknown) => {
          if (isErrorWithCause(er) && isRunResult(er.cause)) {
            this.printResult(label, er.cause)
          }
          failed = true
          throw er
        },
      )
      if (!failed) this.printResult(label, result)
      resultMap.set(label, result)
    }

    const results: Record<string, RunResult> = {}
    for (const [wsPath, result] of resultMap) {
      if (result.status === 0 && result.signal === null) {
        result.stdout = ''
        result.stderr = ''
      }
      results[wsPath] = result
    }
    return results
  }

  printResult(path: string, result: RunResult) {
    // non-human results just get printed at the end
    if (this.view !== 'human') return

    if (result.status === 0 && result.signal === null) {
      stdout(path, 'ok')
    } else {
      stdout(
        styleTextStdout(
          ['bgWhiteBright', 'black', 'bold'],
          path + ' failure',
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

  getCwd(): string {
    // If no node or workspace location is available fall back to project root
    if (this.#nodes) {
      const [first] = this.#nodes
      assert(first, error('no nodes found'))
      return resolve(this.projectRoot, first)
    }
    return (
      this.#monorepo?.values().next().value?.fullpath ??
      this.projectRoot
    )
  }

  fgArg(): RunnerOptions | undefined {
    const cwd = this.getCwd()
    const arg0 = this.arg0 ?? this.defaultArg0()

    // return undefined so noArgsSingle will be called instead
    if (typeof arg0 !== 'string') return

    return {
      cwd,
      /* c8 ignore next - already guarded */
      arg0,
      args: this.args,
      projectRoot: this.projectRoot,
      packageJson: this.conf.options.packageJson,
      'script-shell':
        this.arg0 ? this.conf.get('script-shell') : false,
    }
  }

  bgArg(this: this & { arg0: string }, cwd: string): RunnerOptions {
    return {
      cwd,
      acceptFail: !this.conf.get('bail'),
      ignoreMissing: true,
      arg0: this.arg0,
      args: this.args,
      projectRoot: this.projectRoot,
      packageJson: this.conf.options.packageJson,
      'script-shell': this.conf.get('script-shell'),
    }
  }

  /* c8 ignore start - not used, only here to override */
  noArgsSingle(): ScriptSet {
    throw error('Failed to determine interactive shell to spawn')
  }
  /* c8 ignore stop - not used, only here to override */

  noArgsMulti(): MultiScriptSet {
    throw error(
      'Cannot spawn interactive shells in multiple workspaces',
    )
  }

  *iterateTargets(): Iterable<{
    label: string
    cwd: string
    manifest: NormalizedManifest
  }> {
    if (this.#nodes) {
      for (const location of this.#nodes) {
        const manifest = this.conf.options.packageJson.read(location)
        const label =
          location.startsWith('./') ? location.slice(2) : location
        const cwd = resolve(this.projectRoot, location)
        yield { label, cwd, manifest }
      }
    } else if (this.#monorepo) {
      for (const ws of this.#monorepo.values()) {
        yield {
          label: ws.path,
          cwd: ws.fullpath,
          manifest: ws.manifest,
        }
      }
    }
  }
}
