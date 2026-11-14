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
import { createDiffFilesProvider } from './query-diff-files.ts'
import { isRunResult } from '@vltpkg/run'
import { Monorepo } from '@vltpkg/workspaces'
import type { LoadedConfig } from './config/index.ts'
import { stderr, stdout, styleTextStdout } from './output.ts'
import type { Views } from './view.ts'
import type { SpawnResultStdioStrings } from '@vltpkg/promise-spawn'
import assert from 'node:assert'
import { resolve } from 'node:path'
import { sortScopeLocations } from './sort-scope-locations.ts'

// The graph, query and ansi-to-pre modules are only needed when running
// across several workspaces or with --scope. They are a large share of
// what a plain `vlt run` would otherwise load, so they are imported on
// demand instead of at the top of this module. ansiToAnsi is assigned
// before the multi-workspace loop, the only caller of printResult().
let ansiToAnsi: (s: string) => string

export type RunnerBG = typeof exec | typeof run | typeof runExec
export type RunnerFG = typeof execFG | typeof runExecFG | typeof runFG
export type RunnerOptions = ExecOptions & RunExecOptions & RunOptions
export type MultiRunResult = Record<string, RunResult>
export type ScriptSet = Record<string, string>
export type MultiScriptSet = Record<string, ScriptSet>
export type ExecResult =
  RunFGResult | MultiRunResult | ScriptSet | MultiScriptSet

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
  process.exitCode ||= result.status ?? 1
}

// 523ms, 1.2s, 2m 5.3s
const formatElapsed = (ms: number): string => {
  if (Math.round(ms) < 1000) return `${Math.round(ms)}ms`
  const tenths = Math.round(ms / 100)
  const seconds = `${((tenths % 600) / 10).toFixed(1)}s`
  if (tenths < 600) return seconds
  return `${Math.floor(tenths / 600)}m ${seconds}`
}

export const views = {
  // run results for single or multiple will be printed along the way.
  human: result => {
    if (isScriptSet(result)) stdout('Scripts available:', result)
    else if (isMultiScriptSet(result)) {
      stdout('Scripts available:')
      for (const [path, scripts] of Object.entries(result)) {
        stdout(path, scripts)
      }
    }
  },
  json: result =>
    isRunResult(result) && isSingleSuccess(result) ?
      undefined
    : result,
} as const satisfies Views<ExecResult>

type ViewValues = 'human' | 'json' | 'inspect' | 'silent'

export class ExecCommand<B extends RunnerBG, F extends RunnerFG> {
  bg: B
  fg: F
  arg0?: string
  args: string[]
  env?: NodeJS.ProcessEnv
  #monorepo?: Monorepo
  #nodes?: string[]
  #defaultIgnoreMissing = false
  // workspace labels are padded to this width in multi-workspace output
  #labelWidth = 0
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
    const {
      projectRoot,
      positionals: [arg0, ...args],
    } = conf
    this.arg0 = arg0
    this.args = args
    this.projectRoot = projectRoot
    this.view = this.validViewValues.get(conf.values.view) ?? 'human'
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
    const paths = conf.get('workspace')
    const groups = conf.get('workspace-group')
    const recursive = conf.get('recursive')

    // scope takes precedence over workspaces or groups
    if (queryString) {
      this.#defaultIgnoreMissing = true
      const mainManifest = conf.options.packageJson.maybeRead(
        this.projectRoot,
      )
      // host contexts in queries resolve through conf.options.packageInfo,
      // which `run` and friends otherwise leave unloaded
      const [{ actual }, { Query }, { createHostContextsMap }] =
        await Promise.all([
          import('@vltpkg/graph'),
          import('@vltpkg/query'),
          import('./query-host-contexts.ts'),
          conf.loadPackageInfo(),
        ])
      let graph
      let monorepo: Monorepo | undefined
      if (mainManifest) {
        monorepo = Monorepo.load(this.projectRoot)
        graph = actual.load({
          ...conf.options,
          mainManifest,
          monorepo,
          loadManifests: false,
        })
      }
      const hostContexts = await createHostContextsMap(conf)
      const query = new Query({
        /* c8 ignore start */
        nodes: graph ? new Set(graph.nodes.values()) : new Set(),
        edges: graph?.edges ?? new Set(),
        importers: graph?.importers ?? new Set(),
        /* c8 ignore stop */
        securityArchive: undefined,
        hostContexts,
        diffFiles: createDiffFilesProvider(this.projectRoot),
      })
      const { nodes } = await query.search(queryString, {
        signal: new AbortController().signal,
      })
      const locations: string[] = []
      for (const node of nodes) {
        const { location } = node.toJSON()
        assert(
          location,
          error(`node ${node.id} has no location`, {
            found: node,
          }),
        )
        locations.push(location)
      }
      this.#nodes = sortScopeLocations(locations, monorepo)
    } else if (paths?.length || groups?.length || recursive) {
      this.#defaultIgnoreMissing = true
      this.#monorepo = Monorepo.load(this.projectRoot, {
        load: { paths, groups },
      })
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

    const targets = this.getTargets()
    this.#labelWidth = Math.max(...targets.map(t => t.label.length))
    const totalStart = performance.now()
    ;({ ansiToAnsi } = await import('ansi-to-pre'))

    // run across workspaces
    let failed = false as boolean
    let taskCount = 0
    let failedCount = 0
    const runInDir = async (
      cwd: string,
      label: string,
      signal?: AbortSignal,
    ) => {
      const start = performance.now()
      const arg = { ...this.bgArg(cwd), signal }
      const result = await this.bg(arg).catch((er: unknown) => {
        const elapsed = performance.now() - start
        if (isErrorWithCause(er) && isRunResult(er.cause)) {
          this.printResult(label, er.cause, elapsed)
        }
        failed = true
        throw er
      })
      const elapsed = performance.now() - start
      // If we are allowed to ignore missing commands, then command might be
      // an emptry string. If so, we don't print anything and return null to
      // be filtered out later.
      if (!result.command) return null
      taskCount++
      if (!isSingleSuccess(result)) failedCount++
      if (!failed) this.printResult(label, result, elapsed)
      return result
    }

    const resultMap = new Map<string, SpawnResultStdioStrings>()
    if (this.#nodes) {
      for (const { label, cwd } of targets) {
        const result = await runInDir(cwd, label)
        if (result) resultMap.set(label, result)
      }
    } else if (this.#monorepo) {
      // aborted on the first failure, killing the rest
      const wsResultMap = await this.#monorepo.run((ws, signal) =>
        runInDir(ws.fullpath, ws.path, signal),
      )
      for (const [ws, result] of wsResultMap) {
        if (result) resultMap.set(ws.path, result)
      }
    }

    // summary line, e.g. `3 tasks · 1 failed · 5.1s total`
    if (this.view === 'human' && taskCount > 0) {
      const summary = [
        `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`,
        ...(failedCount ? [`${failedCount} failed`] : []),
        `${formatElapsed(performance.now() - totalStart)} total`,
      ].join(' · ')
      stdout('\n' + styleTextStdout('dim', summary))
    }

    const results: Record<string, RunResult> = {}
    for (const [path, result] of resultMap) {
      results[path] = result
    }
    return results
  }

  printResult(path: string, result: RunResult, elapsed: number) {
    // a failure fails the command in every view, even with --no-bail
    if (!isSingleSuccess(result)) setExitCode(result)
    // non-human results just get printed at the end
    if (this.view !== 'human') return

    const label = styleTextStdout(
      'bold',
      path.padEnd(this.#labelWidth),
    )
    const time = styleTextStdout('dim', `(${formatElapsed(elapsed)})`)
    if (isSingleSuccess(result)) {
      /* c8 ignore start */
      if (result.stderr) stderr(ansiToAnsi(result.stderr))
      if (result.stdout) stdout(ansiToAnsi(result.stdout))
      /* c8 ignore stop */
      const check = styleTextStdout('green', '✓')
      stdout(`${label}  ${check} ${this.arg0} ${time}`)
    } else {
      const cross = styleTextStdout('red', '✗')
      const exit =
        result.signal ?
          `signal ${result.signal}`
        : `exit code ${result.status}`
      stdout(`${label}  ${cross} ${this.arg0} ${time}  ${exit}`)
      /* c8 ignore start */
      if (result.stderr) stderr(ansiToAnsi(result.stderr))
      if (result.stdout) stdout(ansiToAnsi(result.stdout))
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

  // overridden by 'vlt run' which returns undefined
  defaultArg0(): string | undefined {
    return this.interactiveShell()
  }

  getCwd(): string {
    if (this.#nodes) {
      const [first] = this.#nodes
      assert(first, error('no nodes found'))
      return resolve(this.projectRoot, first)
    }
    // When no workspace/monorepo targeting is specified, use the current
    // working directory. This matches npx behavior and is required for
    // tools like node-gyp that must run in the correct directory.
    return (
      this.#monorepo?.values().next().value?.fullpath ?? process.cwd()
    )
  }

  fgArg(): RunnerOptions | undefined {
    const cwd = this.getCwd()
    const arg0 = this.arg0 ?? this.defaultArg0()

    // return undefined so noArgsSingle will be called instead
    if (typeof arg0 !== 'string') return

    return {
      cwd,
      arg0,
      args: this.args,
      env: this.env,
      ignoreMissing:
        this.conf.get('if-present') ?? this.#defaultIgnoreMissing,
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
      ignoreMissing:
        this.conf.get('if-present') ?? this.#defaultIgnoreMissing,
      arg0: this.arg0,
      args: this.args,
      env: this.env,
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

  getTargets(): {
    label: string
    cwd: string
    manifest: NormalizedManifest
  }[] {
    const targets = []
    if (this.#nodes) {
      for (const location of this.#nodes) {
        const manifest = this.conf.options.packageJson.read(location)
        const label =
          /* c8 ignore next */
          location.startsWith('./') ? location.slice(2) : location
        const cwd = resolve(this.projectRoot, location)
        targets.push({ label, cwd, manifest })
      }
    } else if (this.#monorepo) {
      this.#monorepo.runSync(ws => {
        targets.push({
          label: ws.path,
          cwd: ws.fullpath,
          manifest: ws.manifest,
        })
      })
    }
    return targets
  }
}
