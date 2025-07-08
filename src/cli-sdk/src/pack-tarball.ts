import type { Manifest } from '@vltpkg/types'
import { create as tarCreate, list as tarList } from 'tar'
import { minimatch } from 'minimatch'
import { error } from '@vltpkg/error-cause'
import * as ssri from 'ssri'
import assert from 'node:assert'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Spec } from '@vltpkg/spec'
import type { LoadedConfig } from './config/index.ts'

export type PackTarballResult = {
  name: string
  version: string
  filename: string
  tarballData: Buffer
  unpackedSize: number
  files: string[]
  integrity?: string
  shasum?: string
}

/**
 * Replace workspace: and catalog: specs with actual versions
 * @param {Manifest} manifest - The manifest to process
 * @param {LoadedConfig} config - The loaded configuration containing project root, monorepo, and catalog data
 * @returns {Manifest} The manifest with replaced specs
 */
const replaceWorkspaceAndCatalogSpecs = (
  manifest: Manifest,
  config: LoadedConfig,
): Manifest => {
  // Create a deep copy of the manifest to avoid modifying the original
  const processedManifest = JSON.parse(
    JSON.stringify(manifest),
  ) as Manifest

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
    const deps = processedManifest[depType]
    if (!deps || typeof deps !== 'object') continue

    const depsObj = deps as Record<string, unknown>
    for (const [depName, depSpec] of Object.entries(depsObj)) {
      if (typeof depSpec !== 'string') continue

      try {
        // Handle workspace: specs
        if (depSpec.startsWith('workspace:')) {
          if (!monorepo) {
            throw error(
              `No workspace configuration found for ${depName}`,
              { found: depName },
            )
          }

          const spec = Spec.parse(`${depName}@${depSpec}`)
          if (spec.type === 'workspace') {
            // Find the workspace package
            const workspaceName = spec.workspace || depName
            const workspace = monorepo.get(workspaceName)
            if (!workspace) {
              throw error(`Workspace '${workspaceName}' not found`, {
                found: workspaceName,
                validOptions: Array.from(monorepo.keys()),
              })
            }

            // Replace with actual version
            const actualVersion = workspace.manifest.version
            if (!actualVersion) {
              throw error(
                `No version found for workspace '${workspaceName}'`,
                {
                  found: workspaceName,
                  wanted: 'package version',
                },
              )
            }

            depsObj[depName] = actualVersion
          }
        }
        // Handle catalog: specs
        else if (depSpec.startsWith('catalog:')) {
          const spec = Spec.parse(`${depName}@${depSpec}`, {
            catalog,
            catalogs,
          })
          if (spec.type === 'catalog') {
            // Get the resolved version from catalog
            const catalogName = spec.catalog || ''
            const targetCatalog =
              catalogName ? catalogs[catalogName] : catalog

            if (!targetCatalog) {
              throw error(`Catalog '${catalogName}' not found`, {
                found: catalogName,
                validOptions: Object.keys(catalogs),
              })
            }

            const actualVersion = targetCatalog[depName]
            if (!actualVersion) {
              throw error(
                `Package '${depName}' not found in catalog '${catalogName || 'default'}'`,
                {
                  found: depName,
                  validOptions: Object.keys(targetCatalog),
                },
              )
            }

            depsObj[depName] = actualVersion
          }
        }
      } catch (err) {
        // Re-throw with context about which dependency failed
        throw error(
          `Failed to resolve spec for ${depName}@${depSpec} in ${depType}`,
          {
            cause: err,
            spec: depSpec,
            found: depName,
          },
        )
      }
    }
  }

  return processedManifest
}

/**
 * Create a tarball from a package directory
 * @param {Manifest} manifest - The manifest of the package to pack
 * @param {string} dir - The directory containing the package to pack
 * @param {LoadedConfig} [config] - The loaded configuration (for workspace/catalog resolution)
 * @returns {Promise<PackTarballResult>} The manifest, filename, and tarball data (unless dry run)
 */
export const packTarball = async (
  manifest: Manifest,
  dir: string,
  config?: LoadedConfig,
): Promise<PackTarballResult> => {
  assert(
    manifest.name && manifest.version,
    error('Package must have a name and version'),
  )

  const filename = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`

  // Replace workspace: and catalog: specs with actual versions
  let processedManifest = manifest
  if (config) {
    try {
      processedManifest = replaceWorkspaceAndCatalogSpecs(
        manifest,
        config,
      )
    } catch (err) {
      throw error('Failed to resolve workspace and catalog specs', {
        cause: err,
        name: manifest.name,
        version: manifest.version,
      })
    }
  }

  // Create a temporary backup of the original package.json
  const originalPackageJsonPath = resolve(dir, 'package.json')
  const originalPackageJsonContent = readFileSync(
    originalPackageJsonPath,
    'utf8',
  )

  try {
    // Write the processed manifest to the actual package.json temporarily
    writeFileSync(
      originalPackageJsonPath,
      JSON.stringify(processedManifest, null, 2),
    )

    const tarballData = await tarCreate(
      {
        cwd: dir,
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
          const manifestWithFiles = manifest as Manifest & {
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
      tarballData,
      unpackedSize,
      files,
      integrity,
      shasum,
    }
  } finally {
    // Restore the original package.json
    writeFileSync(originalPackageJsonPath, originalPackageJsonContent)
  }
}
