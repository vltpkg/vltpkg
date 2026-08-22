import { createHash } from 'node:crypto'
import { create as tarCreate } from 'tar'
import type { Skill } from './types.ts'

export const computeDigest = (bytes: Buffer): string =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`

/**
 * Bundle `files` (already validated by `resolveSkillFiles`, so never
 * escape `skill.dir`) into an in-memory gzipped tarball, the same
 * `tar.create(...).concat()` pattern `packTarball` uses in
 * `src/cli-sdk/src/pack-tarball.ts`.
 */
export const buildArchive = (
  skill: Skill,
  files: string[],
): Promise<Buffer> =>
  tarCreate({ cwd: skill.dir, gzip: true }, files).concat()
