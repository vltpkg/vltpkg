import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from '@vltpkg/git'
import { error } from '@vltpkg/error-cause'
import type { LockfileData } from './types.ts'

export const LOCKFILE_NAME = 'vlt-lock.json'

/** Current format version, mirrored from `@vltpkg/graph`. */
export const LOCKFILE_VERSION = 1

export type Source =
  /** the lockfile as it sits on disk right now */
  | { kind: 'worktree' }
  /** the lockfile as of a git ref */
  | { kind: 'git'; ref: string }
  /** an explicit path to a lockfile */
  | { kind: 'file'; path: string }

/** A ref that predates the lockfile diffs cleanly against one that has it. */
const EMPTY: LockfileData = {
  lockfileVersion: LOCKFILE_VERSION,
  options: {},
  nodes: {},
  edges: {},
}

export const describeSource = (source: Source) =>
  source.kind === 'git' ? source.ref
  : source.kind === 'file' ? source.path
  : 'working tree'

const parseLockfile = (raw: string, source: Source): LockfileData => {
  let data: LockfileData
  try {
    data = JSON.parse(raw) as LockfileData
  } catch (er) {
    throw error('invalid lockfile JSON', {
      cause: er,
      found: describeSource(source),
    })
  }
  // name the side that failed -- reading a ref from before a format bump
  // is an ordinary thing to do, and a bare version error would not say
  // which of the two lockfiles was at fault
  if (data.lockfileVersion !== LOCKFILE_VERSION) {
    throw error('unsupported lockfile version', {
      found: data.lockfileVersion,
      wanted: LOCKFILE_VERSION,
      name: describeSource(source),
    })
  }
  return data
}

/**
 * Read one side of the diff. Returns an empty lockfile when the ref
 * predates the file, so "the lockfile was introduced here" renders as a
 * diff rather than an error.
 */
export const readSource = async (
  source: Source,
  projectRoot: string,
): Promise<LockfileData> => {
  if (source.kind === 'git') {
    // the lockfile is at the project root, which may sit below the git
    // root, so ask git where we are rather than assuming
    const { stdout: prefix } = await spawn(
      ['rev-parse', '--show-prefix'],
      { cwd: projectRoot },
    )
    let stdout: string
    try {
      ;({ stdout } = await spawn(
        ['show', `${source.ref}:${prefix.trim()}${LOCKFILE_NAME}`],
        { cwd: projectRoot },
      ))
    } catch {
      return EMPTY
    }
    return parseLockfile(stdout, source)
  }

  const path =
    source.kind === 'file' ?
      source.path
    : resolve(projectRoot, LOCKFILE_NAME)
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    if (source.kind === 'worktree') return EMPTY
    throw error('lockfile not found', { path })
  }
  return parseLockfile(raw, source)
}
