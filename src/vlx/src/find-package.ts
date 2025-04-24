import type { PackageJson } from '@vltpkg/package-json'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { walkUp } from 'walk-up-path'
import type { VlxInfo, VlxManifest } from './index.ts'
import { inferDefaultExecutable } from './infer-default-executable.ts'

const maybeManifest = (p: string, packageJson: PackageJson) => {
  try {
    return packageJson.read(p)
  } catch {
    return {}
  }
}

/**
 * Find the nearest package in a node_modules folder between the cwd
 * and the projectRoot. This should only be used to look for local packages.
 * Note that the `resolved` value in the VlxInfo object is a bit useless,
 * as we didn't install anything and so don't need to do a full resolution.
 */
export const findPackage = async (
  name: string,
  projectRoot: string,
  packageJson: PackageJson,
): Promise<undefined | VlxInfo> => {
  for (const path of walkUp(process.cwd())) {
    const p = resolve(path, 'node_modules', name)
    const manifest = maybeManifest(path, packageJson)
    try {
      const m = packageJson.read(p, { reload: true })
      const bin = inferDefaultExecutable(m)
      const { vlx = {} } = manifest as VlxManifest
      return {
        path,
        name,
        version: m.version,
        resolved: String(pathToFileURL(p)),
        arg0: bin?.[0],
        ...vlx,
      }
    } catch {}
    if (relative(path, projectRoot) === '') break
  }
}
