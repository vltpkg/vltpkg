import { error } from '@vltpkg/error-cause'
import { install } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import type { Spec } from '@vltpkg/spec'
import { XDG } from '@vltpkg/xdg'
import { createHash } from 'node:crypto'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import { dirExists } from './dir-exists.ts'
import { doPrompt } from './do-prompt.ts'
import type { PromptFn, VlxInfo, VlxOptions } from './index.ts'
import { inferName } from './infer-name.ts'
import { vlxInfo } from './info.ts'

/**
 * Install a given package spec in the appropriate folder, if it's not
 * already present.
 */
export const vlxInstall = async (
  spec: Spec | string,
  options: VlxOptions,
  promptFn?: PromptFn,
): Promise<VlxInfo> => {
  const pkgSpec = inferName(spec, options)

  // Use the cache as much as possible, to prevent unnecessarily waiting
  // to run a command while installing something. The one we used last
  // time is almost certainly fine.
  //
  // Exception: the root spec when it's a dist-tag or bare name.
  // package-info forces a revalidation for those (#1656), so `vlx foo`
  // pays a conditional GET even when already installed -- `resolved` is
  // part of the install dir hash, so it can't short-circuit any earlier.
  // A forced revalidation still falls back to the cached entry if the
  // registry can't be reached, and Infinity here keeps that fallback
  // open forever, so offline `vlx` keeps working off the last answer.
  options = {
    ...options,
    ['stale-while-revalidate-factor']: Infinity,
  }
  const packageInfo = (options.packageInfo = new PackageInfoClient(
    options,
  ))

  const resolution = await packageInfo.resolve(pkgSpec, options)
  const hash = createHash('sha512')
    .update(resolution.resolved)
    .digest('hex')
    .substring(0, 8)
  const xdg = new XDG('vlt/vlx')
  const dir = xdg.data(pkgSpec.name.replace('/', '+') + '-' + hash)
  if (await dirExists(dir)) {
    try {
      return vlxInfo(dir, options)
    } catch {
      // If vlxInfo fails, the directory likely contains a broken installation
      // Clean it up and retry the full installation process
      await rm(dir, { recursive: true, force: true })
    }
  }

  const ok =
    options.yes ||
    (await doPrompt(pkgSpec, dir, resolution.resolved, promptFn))
  if (!ok) throw error('Operation aborted')

  await mkdir(resolve(dir, 'node_modules/.vlt'), { recursive: true })

  const manifest = {
    name: 'vlx',
    dependencies: {
      [pkgSpec.name]: resolution.resolved,
    },
    vlx: {
      integrity: resolution.integrity,
      signatures: resolution.signatures,
    },
  }

  await writeFile(
    resolve(dir, 'package.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )

  const { graph } = await install({
    ...options,
    packageInfo,
    projectRoot: dir,
    monorepo: undefined,
    scurry: new PathScurry(dir),
    // allow lifecycle scripts but filter out malware via security archive
    allowScripts: ':scripts:not(:malware)',
  })

  // an abbreviated packument carries no integrity; the install hashed
  // the tarball it extracted, so pin that
  const installed = graph.mainImporter.edgesOut.get(pkgSpec.name)?.to
  if (!manifest.vlx.integrity && installed?.integrity) {
    manifest.vlx.integrity = installed.integrity
    await writeFile(
      resolve(dir, 'package.json'),
      JSON.stringify(manifest, null, 2) + '\n',
    )
  }

  return vlxInfo(dir, options, manifest)
}
