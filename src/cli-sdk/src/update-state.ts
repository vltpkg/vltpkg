import { isObject } from '@vltpkg/types'
import {
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'

export type UpdateState = {
  registry: string
  version: string
  lastCheck: number
  latest?: string
  notifiedVersion?: string
  notifiedAt?: number
}

const isUpdateState = (state: unknown): state is UpdateState =>
  isObject(state) &&
  typeof state.registry === 'string' &&
  typeof state.version === 'string' &&
  typeof state.lastCheck === 'number' &&
  Number.isFinite(state.lastCheck) &&
  (!('latest' in state) || typeof state.latest === 'string') &&
  (!('notifiedVersion' in state) ||
    typeof state.notifiedVersion === 'string') &&
  (!('notifiedAt' in state) ||
    (typeof state.notifiedAt === 'number' &&
      Number.isFinite(state.notifiedAt)))

export const readUpdateState = (
  file: string,
): UpdateState | undefined => {
  try {
    const state: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (isUpdateState(state)) return state
  } catch {}
}

export const writeUpdateState = (
  file: string,
  state: UpdateState,
) => {
  const temporary = `${file}.${process.pid}.tmp`
  try {
    writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 })
    renameSync(temporary, file)
  } finally {
    rmSync(temporary, { force: true })
  }
}
