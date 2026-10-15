import { isDepID } from '@vltpkg/dep-id'
import { isObject } from '@vltpkg/types'
import { randomBytes } from 'node:crypto'
import {
  chmod,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, isAbsolute, resolve } from 'node:path'
import { isInside, samePath } from './global-project.ts'

/** state of the global project that is not config */
export type GlobalState = {
  /** canonical dirs global bins were linked into */
  binDirs?: string[]
  /** store dirs of a replaced running vlt, for the next -g command */
  pendingRemove?: string[]
  /** the ~/.local/bin notice was shown */
  localBinNoticed?: boolean
  /** 'declined': the install -g PATH offer was answered no */
  pathSetup?: 'declined'
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
  if (Array.isArray(state.pendingRemove)) {
    state.pendingRemove = state.pendingRemove.filter(
      (d): d is string => typeof d === 'string' && isAbsolute(d),
    )
  } else delete state.pendingRemove
  if (typeof localBinNoticed !== 'boolean')
    delete state.localBinNoticed
  if (state.pathSetup !== 'declined') delete state.pathSetup
  return state
}

/** write `data` via temp file + rename, with `mode` if set */
export const writeFileAtomic = async (
  file: string,
  data: string | Uint8Array,
  mode?: number,
): Promise<void> => {
  const tmp = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  try {
    await writeFile(tmp, data, {
      flag: 'wx',
      ...(mode === undefined ? {} : { mode }),
    })
    // umask-proof
    if (mode !== undefined) await chmod(tmp, mode)
    await rename(tmp, file)
  } catch (er) {
    await rm(tmp, { force: true })
    throw er
  }
}

/** write `data` as JSON via temp file + rename */
export const writeJsonAtomic = (
  file: string,
  data: unknown,
): Promise<void> =>
  writeFileAtomic(file, JSON.stringify(data, null, 2) + '\n')

/** read, change and write the state file */
export const updateGlobalState = async (
  root: string,
  fn: (state: GlobalState) => GlobalState,
): Promise<GlobalState> => {
  const state = fn(await readGlobalState(root))
  await writeJsonAtomic(globalStateFile(root), state)
  return state
}

/** rm dirs a running vlt could not remove from under itself */
export const sweepPendingRemove = async (
  root: string,
): Promise<void> => {
  try {
    const { pendingRemove = [] } = await readGlobalState(root)
    if (!pendingRemove.length) return
    const store = resolve(await realpath(root), 'node_modules/.vlt')
    const script = process.argv[1]
    const running =
      script && (await realpath(script).catch(() => undefined))
    const left: string[] = []
    for (const entry of pendingRemove) {
      // only store dirs, whatever the file says
      if (
        !samePath(dirname(entry), store) ||
        !isDepID(basename(entry))
      ) {
        continue
      }
      if (running && isInside(entry, running)) {
        left.push(entry)
        continue
      }
      // win32: EBUSY while another vlt runs from it
      await rm(entry, { recursive: true, force: true }).catch(() =>
        left.push(entry),
      )
    }
    if (left.length === pendingRemove.length) return
    await updateGlobalState(root, s => ({
      ...s,
      pendingRemove: left,
    }))
  } catch {}
}
