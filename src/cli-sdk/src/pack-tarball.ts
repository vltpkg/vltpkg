import type { NormalizedManifest } from '@vltpkg/types'
import { create as tarCreate, list as tarList } from 'tar'
import { minimatch } from 'minimatch'
import { error } from '@vltpkg/error-cause'
import * as ssri from 'ssri'
import assert from 'node:assert'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { Spec } from '@vltpkg/spec'
import type { LoadedConfig } from './config/index.ts'
import { join } from 'node:path'
import { parse, stringify } from 'polite-json'
import ignore from 'ignore'

export type PackTarballResult = {
  name: string
  version: string
  filename: string
  tarballName: string
  tarballData: Buffer
  unpackedSize: number
  files: string[]
  integrity?: string
  shasum?: string
  /** The manifest used for packing (may differ from input when publishConfig.directory is set). */
  resolvedManifest: NormalizedManifest
}

/**
 * Replace workspace: and catalog: specs with actual versions
 * @param {NormalizedManifest} manifest_ - The manifest to process
 * @param {LoadedConfig} config - The loaded configuration containing project root, monorepo, and catalog data
 * @returns {NormalizedManifest} The manifest with replaced specs
 */
const replaceWorkspaceAndCatalogSpecs = (
  manifest_: NormalizedManifest,
  config: LoadedConfig,
): NormalizedManifest => {
  // Create a json copy of the manifest to avoid modifying the original
  // preserves original formatting symbols from polite-json
  const manifest = parse(stringify(manifest_)) as NormalizedManifest

  // Get workspace and catalog configuration from config
  const { monorepo, catalog = {}, catalogs = {} } = config.options

  // Process dependency types
  const depTypes = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ] as const

  for (const depType of depTypes) {
    const deps = manifest[depType]
    /* c8 ignore next */
    if (!deps || typeof deps !== 'object') continue

    const depsObj = deps as Record<string, unknown>
    for (const [depName, depSpec] of Object.entries(depsObj)) {
      /* c8 ignore next */
      if (typeof depSpec !== 'string') continue

      const spec = Spec.parse(`${depName}@${depSpec}`, {
        catalog,
        catalogs,
      })

      switch (spec.type) {
        case 'workspace': {
          assert(
            monorepo,
            error(`No workspace configuration found for ${depName}`, {
              found: depName,
            }),
          )

          const workspaceName = spec.workspace
          assert(
            workspaceName,
            error(`No workspace name found for ${depName}`, {
              found: depName,
            }),
          )

          const workspace = monorepo.get(workspaceName)
          assert(
            workspace,
            error(`Workspace '${workspaceName}' not found`, {
              found: workspaceName,
              validOptions: Array.from(monorepo.keys()),
            }),
          )

          const actualVersion = workspace.manifest.version
          assert(
            actualVersion,
            error(
              `No version found for workspace '${workspaceName}'`,
              {
                found: workspaceName,
                wanted: 'package version',
              },
            ),
          )

          depsObj[depName] = actualVersion

          break
        }

        case 'catalog': {
          const catalogName = spec.catalog || ''
          const targetCatalog =
            catalogName ? catalogs[catalogName] : catalog
          assert(
            targetCatalog,
            error(`Catalog '${catalogName}' not found`, {
              found: catalogName,
              validOptions: Object.keys(catalogs),
            }),
          )

          const actualVersion = targetCatalog[depName]
          assert(
            actualVersion,
            error(
              `Package '${depName}' not found in catalog '${catalogName || 'default'}'`,
              {
                found: depName,
                validOptions: Object.keys(targetCatalog),
              },
            ),
          )

          depsObj[depName] = actualVersion

          break
        }
      }
    }
  }

  return manifest
}

const alwaysExcludePatterns = [
  /^\.?\/?\.git(\/|$)/,
  /^\.?\/?node_modules(\/|$)/,
  /^\.?\/?\.nyc_output(\/|$)/,
  /^\.?\/?coverage(\/|$)/,
  /^\.?\/?\.vscode(\/|$)/,
  /^\.?\/?\.idea(\/|$)/,
  /^\.?\/?\.DS_Store$/,
  /^\.?\/?\.npmrc$/,
  /^\.?\/?\.gitignore$/,
  /^\.?\/?\.npmignore$/,
  /^\.?\/?\.editorconfig$/,
  /^\.?\/?package-lock\.json$/,
  /^\.?\/?yarn\.lock$/,
  /^\.?\/?pnpm-lock\.yaml$/,
  /^\.?\/?bun\.lockb$/,
  /^\.?\/?bun\.lock$/,
  /^\.?\/?vlt-lock\.json$/,
  /^\.?\/?vlt\.json$/,
  /~$/,
  /\.swp$/,
  /\.tgz$/,
]

const alwaysIncludePatterns = [
  /^README(\..*)?$/i,
  /^CHANGELOG(\..*)?$/i,
  /^HISTORY(\..*)?$/i,
  /^LICENSE(\..*)?$/i,
  /^LICENCE(\..*)?$/i,
]

/**
 * Read an ignore file (.npmignore or .gitignore) and return its contents,
 * or undefined if the file does not exist.
 */
const readIgnoreFile = (
  dir: string,
  name: string,
): string | undefined => {
  const filePath = join(dir, name)
  if (!existsSync(filePath)) return undefined
  return readFileSync(filePath, 'utf8')
}

/**
 * Build the tar filter function for packing.
 *
 * Follows npm's precedence rules:
 *   1. `files` field in package.json → allowlist (ignore files are not read)
 *   2. `.npmignore` → denylist (`.gitignore` is NOT read)
 *   3. `.gitignore` → fallback denylist when no `.npmignore` exists
 *
 * Regardless of mode, always-excluded files (lockfiles, .git, node_modules,
 * .npmrc, vlt.json, etc.) are excluded and always-included files (package.json,
 * README, LICENSE, etc.) are included.
 */
export const buildPackFilter = (
  manifest: NormalizedManifest,
  packDir: string,
): ((path: string) => boolean) => {
  const manifestWithFiles = manifest as NormalizedManifest & {
    files?: string[]
  }
  const hasFilesField =
    Array.isArray(manifestWithFiles.files) &&
    manifestWithFiles.files.length > 0
  const hasEmptyFilesField =
    Array.isArray(manifestWithFiles.files) &&
    manifestWithFiles.files.length === 0

  // Build ignore matcher from .npmignore or .gitignore (only when no files field)
  let ig: ReturnType<typeof ignore> | undefined
  if (!hasFilesField && !hasEmptyFilesField) {
    const npmignoreContent = readIgnoreFile(packDir, '.npmignore')
    if (npmignoreContent !== undefined) {
      ig = ignore().add(npmignoreContent)
    } else {
      const gitignoreContent = readIgnoreFile(packDir, '.gitignore')
      if (gitignoreContent !== undefined) {
        ig = ignore().add(gitignoreContent)
      }
    }
  }

  return (path: string) => {
    const normalizedPath = path.replace(/^\.\//, '')

    if (path === '.' || normalizedPath === '') {
      return true
    }

    if (
      alwaysExcludePatterns.some(pattern =>
        pattern.test(normalizedPath),
      )
    ) {
      return false
    }

    if (
      alwaysIncludePatterns.some(pattern =>
        pattern.test(normalizedPath),
      )
    ) {
      return true
    }

    if (normalizedPath === 'package.json') {
      return true
    }

    // files field: allowlist mode
    if (hasEmptyFilesField) {
      return false
    }

    if (hasFilesField && manifestWithFiles.files) {
      return manifestWithFiles.files.some((pattern: string) => {
        if (pattern.endsWith('/')) {
          const dirName = pattern.slice(0, -1)
          const globPattern = pattern.replace(/\/$/, '/**')
          const matchesDir = normalizedPath === dirName
          const matchesContents = minimatch(
            normalizedPath,
            globPattern,
            { dot: true },
          )
          return matchesDir || matchesContents
        }

        const directMatch = minimatch(normalizedPath, pattern, {
          dot: true,
        })
        const isParentDir =
          pattern.includes('/') &&
          pattern.startsWith(normalizedPath + '/')
        const isChildOfPattern = minimatch(
          normalizedPath,
          pattern + '/**',
          { dot: true },
        )
        return directMatch || isParentDir || isChildOfPattern
      })
    }

    // Ignore-file mode: apply .npmignore or .gitignore deny patterns
    if (ig?.ignores(normalizedPath)) {
      return false
    }

    return true
  }
}

/**
 * Create a tarball from a package directory
 * @param {NormalizedManifest} manifest - The manifest of the package to pack
 * @param {string} dir - The directory containing the package to pack
 * @param {LoadedConfig} [config] - The loaded configuration (for workspace/catalog resolution)
 * @returns {Promise<PackTarballResult>} The manifest, filename, and tarball data (unless dry run)
 */
export const packTarball = async (
  manifest: NormalizedManifest,
  dir: string,
  config: LoadedConfig,
): Promise<PackTarballResult> => {
  let packDir = dir

  // Check if publishDirectory is configured via CLI flag or package.json publishConfig.directory
  const cliPublishDir = config.get('publish-directory')
  const manifestPublishDir = (
    manifest as NormalizedManifest & {
      publishConfig?: { directory?: string }
    }
  ).publishConfig?.directory

  const publishDirectory = cliPublishDir ?? manifestPublishDir
  if (publishDirectory) {
    // CLI flag paths are used as-is; publishConfig.directory is relative to the package dir
    const resolvedPublishDir =
      cliPublishDir ? publishDirectory : join(dir, publishDirectory)
    // Validate that the publish directory exists and is a directory
    assert(
      existsSync(resolvedPublishDir),
      error(
        `Publish directory does not exist: ${resolvedPublishDir}`,
        {
          found: resolvedPublishDir,
        },
      ),
    )
    assert(
      statSync(resolvedPublishDir).isDirectory(),
      error(
        `Publish directory is not a directory: ${resolvedPublishDir}`,
        {
          found: resolvedPublishDir,
          wanted: 'directory',
        },
      ),
    )
    if (existsSync(join(resolvedPublishDir, 'package.json'))) {
      manifest = config.options.packageJson.read(resolvedPublishDir)
    }
    packDir = resolvedPublishDir
  }

  assert(
    manifest.name && manifest.version,
    error('Package must have a name and version'),
  )

  const processedManifest = replaceWorkspaceAndCatalogSpecs(
    manifest,
    config,
  )

  const filename = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`
  const tarballName = `${manifest.name}-${manifest.version}.tgz`

  try {
    config.options.packageJson.write(packDir, processedManifest)

    const packFilter = buildPackFilter(manifest, packDir)

    const tarballData = await tarCreate(
      {
        cwd: packDir,
        gzip: true,
        portable: true,
        prefix: 'package/',
        filter: packFilter,
      },
      ['.'],
    ).concat()

    let unpackedSize = 0
    const files: string[] = []
    await new Promise<void>((resolve, reject) => {
      const stream = tarList({
        onentry: entry => {
          if (entry.type === 'File') {
            unpackedSize += entry.size
            // Remove the package/ prefix for cleaner file listing
            const cleanPath = entry.path.replace(/^[^/]+\//, '')
            if (cleanPath) {
              // Skip empty paths
              files.push(cleanPath)
            }
          }
        },
      })
      stream
        .on('end', () => resolve())
        .on('error', reject)
        .write(tarballData)
      stream.end()
    })

    const integrityMap = ssri.fromData(tarballData, {
      algorithms: [...new Set(['sha1', 'sha512'])],
    })

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const integrity = integrityMap.sha512?.[0]?.toString()
    // @ts-expect-error -- types from DT are missing hexDigest
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const shasum = integrityMap.sha1?.[0]?.hexDigest() as
      | string
      | undefined

    return {
      name: manifest.name,
      version: manifest.version,
      filename,
      tarballName,
      tarballData,
      unpackedSize,
      files,
      integrity,
      shasum,
      resolvedManifest: processedManifest,
    }
  } finally {
    // Restore the original package.json to the pack directory
    config.options.packageJson.write(packDir, manifest)
  }
}
