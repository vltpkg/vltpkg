import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import { ViewClass } from '../view.ts'
import { error } from '@vltpkg/error-cause'
import { isRunResult, run, runFG } from '@vltpkg/run'
import type { RunFGResult, RunResult } from '@vltpkg/run'
import { Monorepo } from '@vltpkg/workspaces'
import type { Workspace } from '@vltpkg/workspaces'
import { Box, render, Text } from 'ink'
import type { Instance } from 'ink'
import Spinner from 'ink-spinner'
import {
  createElement as $,
  Fragment,
  useLayoutEffect,
  useState,
} from 'react'

const App = () => {
  useLayoutEffect(() => {}, [])

  return $(Box, null, $(Text, null, 'ok'))
}

export class RunReporter extends ViewClass {
  #instance: Instance | null = null

  start() {
    this.#instance = render($(App))
  }

  done() {
    this.#instance?.unmount()
    return undefined
  }

  error(err: unknown) {
    this.#instance?.unmount(err as Error)
  }
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'run',
    usage: '<script> [args ...]',
    description: `Run a script defined in 'package.json', passing along any extra
                  arguments. Note that vlt config values must be specified *before*
                  the script name, because everything after that is handed off to
                  the script process.`,
  })

const setExitCode = (result: RunResult) => {
  process.exitCode = process.exitCode || (result.status ?? 1)
}

type CommandResult =
  | Record<string, string>
  | Map<Workspace, Record<string, string>>
  | RunFGResult
  | Map<Workspace, RunResult>

export const views: Views<CommandResult> = {
  json: g => g,
  human: RunReporter,
}

export const command: CommandFn<CommandResult> = async conf => {
  const [arg0, ...args] = conf.positionals
  const { projectRoot, packageJson } = conf.options

  const paths = conf.get('workspace')
  const groups = conf.get('workspace-group')
  const monorepo =
    paths?.length || groups?.length || conf.get('recursive') ?
      Monorepo.load(projectRoot, { load: { paths, groups } })
    : undefined

  if (!arg0) {
    return monorepo ?
        monorepo.runSync(ws => ws.manifest.scripts ?? {})
      : (packageJson.read(projectRoot).scripts ?? {})
  }

  const spaces = monorepo?.size ?? 1

  if (!monorepo || spaces === 0) {
    throw error('no matching workspaces found', {
      validOptions: [...(monorepo?.load().paths() ?? [])],
    })
  }

  if (spaces === 1) {
    const ws = monorepo.values().next().value
    const cwd = ws?.fullpath ?? projectRoot
    const result = await runFG({
      cwd,
      arg0,
      args,
      projectRoot,
      packageJson,
      'script-shell': arg0 ? conf.get('script-shell') : false,
    })
    if (isRunResult(result)) {
      setExitCode(result)
    }
    return result
  }

  return monorepo.run(ws =>
    run({
      cwd: ws.fullpath,
      acceptFail: !conf.get('bail'),
      ignoreMissing: true,
      arg0,
      args,
      projectRoot,
      packageJson,
      'script-shell': conf.get('script-shell'),
    }),
  )
}
