import type { Spec } from '@vltpkg/spec'
import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { VlxInfo, VlxManifest, VlxOptions } from './index.ts'
import { vlxInfo } from './info.ts'

/**
 * Whether an error says a host could not be reached, as opposed to
 * answering: the registry client's `EREQUEST`, however wrapped.
 */
export const unreachable = (er: unknown): boolean => {
  for (
    let c = er;
    c && typeof c === 'object';
    c = (c as { cause?: unknown }).cause
  ) {
    if ((c as { code?: unknown }).code === 'EREQUEST') return true
  }
  return false
}

/**
 * The newest install dir under `root` of exactly `spec`, if any: what
 * to run when its host can't be reached to resolve it again. Dirs
 * that can't be read, or installed another spec, are passed over.
 */
export const lastInstall = async (
  spec: Spec,
  root: string,
  options: VlxOptions,
): Promise<VlxInfo | undefined> => {
  const prefix = spec.name.replace('/', '+') + '-'
  const key = String(spec)
  const { packageJson } = options
  const found: [number, string][] = []
  for (const name of await readdir(root).catch(() => [])) {
    if (!name.startsWith(prefix)) continue
    const dir = resolve(root, name)
    try {
      const { vlx } = packageJson.read(dir) as VlxManifest
      if (vlx?.spec !== key) continue
      const { mtimeMs } = await stat(resolve(dir, 'package.json'))
      found.push([mtimeMs, dir])
    } catch {}
  }
  for (const [, dir] of found.sort((a, b) => b[0] - a[0])) {
    try {
      return vlxInfo(dir, options)
    } catch {}
  }
}
