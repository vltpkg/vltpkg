import type { Manifest } from '@vltpkg/types'
import { create as tarCreate, list as tarList } from 'tar'
import { minimatch } from 'minimatch'
import { error } from '@vltpkg/error-cause'
import * as ssri from 'ssri'
import assert from 'node:assert'

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
 * Create a tarball from a package directory
 * @param {Manifest} manifest - The manifest of the package to pack
 * @param {string} dir - The directory containing the package to pack
 * @returns {Promise<PackTarballResult>} The manifest, filename, and tarball data (unless dry run)
 */
export const packTarball = async (
  manifest: Manifest,
  dir: string,
): Promise<PackTarballResult> => {
  assert(
    manifest.name && manifest.version,
    error('Package must have a name and version'),
  )

  const filename = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`

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
          /^package\.json$/,
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

            // File pattern: check direct match and if this path is a parent directory
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
}
