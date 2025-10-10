import type { NormalizedManifest } from '@vltpkg/types'
import { create as tarCreate, list as tarList } from 'tar'
import { minimatch } from 'minimatch'
import { error } from '@vltpkg/error-cause'
import * as ssri from 'ssri'
import assert from 'node:assert'
import { existsSync, statSync } from 'node:fs'
import { Spec } from '@vltpkg/spec'
import type { LoadedConfig } from './config/index.ts'
import { join } from 'node:path'
import { parse, stringify } from 'polite-json'

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

  // Check if publishDirectory is configured
  const publishDirectory = config.get('publish-directory')
  if (publishDirectory) {
    // Validate that the publish directory exists and is a directory
    assert(
      existsSync(publishDirectory),
      error(`Publish directory does not exist: ${publishDirectory}`, {
        found: publishDirectory,
      }),
    )
    assert(
      statSync(publishDirectory).isDirectory(),
      error(
        `Publish directory is not a directory: ${publishDirectory}`,
        {
          found: publishDirectory,
          wanted: 'directory',
        },
      ),
    )
    if (existsSync(join(publishDirectory, 'package.json'))) {
      manifest = config.options.packageJson.read(publishDirectory)
    }
    packDir = publishDirectory
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

    const tarballData = await tarCreate(
      {
        cwd: packDir,
        gzip: true,
        portable: true,
        prefix: 'package/',
        filter: (path: string) => {
          // Normalize path - remove leading './'
          const normalizedPath = path.replace(/^\.\//, '')

          // Always include root directory
          if (path === '.' || normalizedPath === '') {
            return true
          }

          // Always exclude certain files/directories
          const alwaysExcludePatterns = [
            /^\.?\/?\.git(\/|$)/,
            /^\.?\/?node_modules(\/|$)/,
            /^\.?\/?\.nyc_output(\/|$)/,
            /^\.?\/?coverage(\/|$)/,
            /^\.?\/?\.DS_Store$/,
            /^\.?\/?\.npmrc$/,
            /^\.?\/?package-lock\.json$/,
            /^\.?\/?yarn\.lock$/,
            /^\.?\/?pnpm-lock\.yaml$/,
            /^\.?\/?bun\.lockb$/,
            /^\.?\/?bun\.lock$/,
            /^\.?\/?vlt-lock\.json$/,
            /~$/,
            /\.swp$/,
          ]

          if (
            alwaysExcludePatterns.some(pattern =>
              pattern.test(normalizedPath),
            )
          ) {
            return false
          }

          // Always include certain files
          const alwaysIncludePatterns = [
            /^README(\..*)?$/i,
            /^CHANGELOG(\..*)?$/i,
            /^HISTORY(\..*)?$/i,
            /^LICENSE(\..*)?$/i,
            /^LICENCE(\..*)?$/i,
          ]

          if (
            alwaysIncludePatterns.some(pattern =>
              pattern.test(normalizedPath),
            )
          ) {
            return true
          }

          // Always include package.json
          if (normalizedPath === 'package.json') {
            return true
          }

          // If files field is specified in package.json, use it for inclusion
          const manifestWithFiles = manifest as NormalizedManifest & {
            files?: string[]
          }
          if (
            manifestWithFiles.files &&
            Array.isArray(manifestWithFiles.files)
          ) {
            // Empty files array means exclude everything except always-included files
            if (manifestWithFiles.files.length === 0) {
              return false
            }
            return manifestWithFiles.files.some((pattern: string) => {
              if (pattern.endsWith('/')) {
                const dirName = pattern.slice(0, -1)
                const globPattern = pattern.replace(/\/$/, '/**')
                const matchesDir = normalizedPath === dirName
                const matchesContents = minimatch(
                  normalizedPath,
                  globPattern,
                  {
                    dot: true,
                  },
                )
                return matchesDir || matchesContents
              }

              // File pattern: check direct match and if this path is a directory that could contain the pattern
              const directMatch = minimatch(normalizedPath, pattern, {
                dot: true,
              })
              // Check if this path is a directory that could contain the pattern
              const isParentDir =
                pattern.includes('/') &&
                pattern.startsWith(normalizedPath + '/')
              return directMatch || isParentDir
            })
          }

          // Default behavior when no files field - exclude common development files
          const defaultExcludePatterns = [
            /^\.?\/?\.vscode(\/|$)/,
            /^\.?\/?\.idea(\/|$)/,
            /^\.?\/?\.gitignore$/,
            /^\.?\/?\.npmignore$/,
            /^\.?\/?\.editorconfig$/,
          ]

          return !defaultExcludePatterns.some(pattern =>
            pattern.test(normalizedPath),
          )
        },
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
    }
  } finally {
    // Restore the original package.json to the pack directory
    config.options.packageJson.write(packDir, manifest)
  }
}
