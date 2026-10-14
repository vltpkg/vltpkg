import { isObject } from '@vltpkg/types'
import { randomBytes } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'

/** state of the global project that is not config */
export type GlobalState = {
  /** canonical dirs global bins were linked into */
  binDirs?: string[]
  /** the ~/.local/bin notice was shown */
  localBinNoticed?: boolean
  /** keys of other features, kept as-is */
  [key: string]: unknown
}

export const globalStateFile = (root: string): string =>
  resolve(root, 'global-state.json')

/** missing or malformed reads as `{}` */
export const readGlobalState = async (
  root: string,
): Promise<GlobalState> => {
  let data: unknown
  try {
    data = JSON.parse(await readFile(globalStateFile(root), 'utf8'))
  } catch {
    return {}
  }
  if (!isObject(data)) return {}
  const state: GlobalState = { ...data }
  const { binDirs, localBinNoticed } = state
  if (Array.isArray(binDirs)) {
    state.binDirs = binDirs.filter(
      (d): d is string => typeof d === 'string' && isAbsolute(d),
    )
  } else delete state.binDirs
  if (typeof localBinNoticed !== 'boolean')
    delete state.localBinNoticed
  return state
}

/** write `data` as JSON via temp file + rename */
export const writeJsonAtomic = async (
  file: string,
  data: unknown,
): Promise<void> => {
  const tmp = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  try {
    await writeFile(tmp, JSON.stringify(data, null, 2) + '\n')
    await rename(tmp, file)
  } catch (er) {
    await rm(tmp, { force: true })
    throw er
  }
}

/** read, change and write the state file */
export const updateGlobalState = async (
  root: string,
  fn: (state: GlobalState) => GlobalState,
): Promise<GlobalState> => {
  const state = fn(await readGlobalState(root))
  await writeJsonAtomic(globalStateFile(root), state)
  return state
}
