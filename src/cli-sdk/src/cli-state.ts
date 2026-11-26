import { isObject } from '@vltpkg/types'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { writeJsonAtomic } from './global-state.ts'

const cliStateFile = (projectRoot: string): string =>
  resolve(projectRoot, 'node_modules/.vlt/cli-state.json')

/** project state that is not config; missing or malformed reads as `{}` */
export const readCliState = async (
  projectRoot: string,
): Promise<Record<string, unknown>> => {
  try {
    const data: unknown = JSON.parse(
      await readFile(cliStateFile(projectRoot), 'utf8'),
    )
    return isObject(data) ? data : {}
  } catch {
    return {}
  }
}

/**
 * Set one key, keeping the others. Best effort: a missing
 * `node_modules/.vlt` is never created, the temp file write fails.
 */
export const setCliState = async (
  projectRoot: string,
  key: string,
  value: unknown,
): Promise<void> => {
  try {
    await writeJsonAtomic(cliStateFile(projectRoot), {
      ...(await readCliState(projectRoot)),
      [key]: value,
    })
  } catch {}
}
