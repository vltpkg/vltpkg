import { error } from '@vltpkg/error-cause'
import { XDG } from '@vltpkg/xdg'
import type { Stats } from 'node:fs'
import { lstatSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { walkUp } from 'walk-up-path'

import {
  parse as jsonParse,
  stringify as jsonStringify,
  kIndent,
  kNewline,
} from 'polite-json'

const stringifyOptions: Record<
  string,
  {
    [kIndent]: number | string
    [kNewline]: string
  }
> = {}

export type WhichConfig = 'user' | 'project'

const lstatCache: Record<string, Stats> = {}
const cachedLstat = (path: string): undefined | Stats => {
  if (path in lstatCache) return lstatCache[path]
  try {
    return (lstatCache[path] = lstatSync(path))
  } catch {
    delete lstatCache[path]
    return undefined
  }
}

const exists = (f: string) => !!cachedLstat(f)

const isRecord = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object'

const mtimes: Record<WhichConfig, undefined | number> = {
  user: undefined,
  project: undefined,
}

const datas: Record<
  WhichConfig,
  undefined | Record<string, unknown>
> = {
  user: undefined,
  project: undefined,
}

const validators: Record<string, Validator<unknown>> = {}

const paths: Record<WhichConfig, undefined | string> = {
  user: new XDG('vlt').config('vlt.json'),
  project: undefined,
}

const maybeReadData = (
  path: string,
): undefined | Record<string, unknown> => {
  try {
    const rawData = jsonParse(readFileSync(path, 'utf8'))
    if (!isRecord(rawData)) return undefined
    const so = stringifyOptions[path] ?? {
      [kIndent]: 2,
      [kNewline]: '\n',
    }
    const {
      [kNewline]: nl = so[kNewline],
      [kIndent]: ind = so[kIndent],
      ...data
    } = rawData
    stringifyOptions[path] = so
    stringifyOptions[path][kNewline] = nl
    stringifyOptions[path][kIndent] = ind
    return data
  } catch (er) {
    throw error('Failed to parse vlt.json file', {
      path,
      cause: er,
    })
  }
}

const loadFullObject = (
  which: WhichConfig,
): Record<string, unknown> => {
  if (datas[which]) return datas[which]
  const path = find(which)
  const mtime = cachedLstat(path)?.mtime.getTime()
  const data = mtime ? maybeReadData(path) : {}
  if (mtime && data) {
    mtimes[which] = mtime
  }
  return (datas[which] = data ?? {})
}

export type Validator<T> = (
  x: unknown,
  file: string,
) => asserts x is T

const runValidator: <T>(
  v: Validator<T>,
  x: unknown,
  file: string,
) => void = <T>(
  v: Validator<T>,
  x: unknown,
  file: string,
): asserts x is T | undefined => {
  if (x !== undefined) v(x, file)
}

/** This should only be used in tests */
export const unload = (which: WhichConfig = 'project') => {
  const file = find(which)
  delete datas[which]
  delete paths[which]
  delete lstatCache[file]
  delete mtimes[which]
}

export const reload = (
  field: string,
  which: WhichConfig = 'project',
): unknown => {
  unload(which)
  const file = find(which)
  const data = loadFullObject(which)
  for (const [field, validator] of Object.entries(validators)) {
    const value = data[field]
    runValidator(validator, value, file)
  }
  return data[field]
}

export const load = <T>(
  field: string,
  validator: Validator<T>,
  which: WhichConfig = 'project',
): T | undefined => {
  const data = loadFullObject(which)
  const file = find(which)
  validators[field] ??= validator
  const value = data[field]
  if (value !== undefined) validator(value, file)
  return value
}

export const find = (
  which: WhichConfig = 'project',
  cwd = process.cwd(),
  home = homedir(),
): string => {
  if (paths[which]) return paths[which]
  let lastKnownRoot = cwd
  for (const dir of walkUp(cwd)) {
    // don't look in ~
    if (dir === home) break

    const projectConfig = resolve(dir, 'vlt.json')

    // don't let it match user config
    if (projectConfig === paths.user) break

    // these mean we're done looking
    if (exists(projectConfig)) {
      return (paths[which] = projectConfig)
    }

    // these are likely candidates, come back if nothing else matches
    if (
      exists(resolve(dir, 'package.json')) ||
      exists(resolve(dir, 'node_modules'))
    ) {
      lastKnownRoot = dir
    }

    if (exists(resolve(dir, '.git'))) break
  }

  return (paths[which] = resolve(lastKnownRoot, 'vlt.json'))
}

export const save = (
  field: string,
  value: unknown,
  which: WhichConfig = 'project',
): void => {
  const validator = validators[field]
  const data = datas[which]
  if (!validator || !data) {
    throw error('Cannot save field before loading initially', {
      name: field,
      found: value,
    })
  }
  const file = find(which)
  runValidator(validator, value, file)
  data[field] = value
  const mtime = mtimes[which]
  const path = find(which)
  delete lstatCache[path]
  const updatedMtime = cachedLstat(path)?.mtime.getTime()
  // if we didn't have a file, and now do, or if we had a file and
  // it's been changed since we read it, no go.
  if (updatedMtime && (!mtime || updatedMtime > mtime)) {
    throw error(
      'File was changed by another process, cannot safely write',
      {
        path,
        name: field,
        found: value,
      },
    )
  }
  writeFileSync(
    path,
    jsonStringify({ ...data, ...stringifyOptions[path] }),
  )
  delete lstatCache[path]
  mtimes[which] = cachedLstat(path)?.mtime.getTime()
}
