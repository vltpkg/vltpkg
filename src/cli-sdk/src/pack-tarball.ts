import { PackageJson } from '@vltpkg/package-json'
import type { Manifest } from '@vltpkg/types'
import { resolve, isAbsolute } from 'node:path'
import { create as tarCreate } from 'tar'
import { minimatch } from 'minimatch'

export type PackTarballOptions = {
  dry?: boolean
}

export type PackTarballResult = {
  manifest: Manifest
  filename: string
  tarballData?: Buffer
}

/**
 * Create a tarball from a package directory
 * @param {string} path - The directory containing the package to pack
 * @param {PackTarballOptions} options - Options for packing
 * @returns {Promise<PackTarballResult>} The manifest, filename, and tarball data (unless dry run)
 */
export const packTarball = async (
  path: string,
  options: PackTarballOptions = {},
): Promise<PackTarballResult> => {
  // If path is absolute, use it directly. Otherwise resolve relative to projectRoot
  const packTarget =
    isAbsolute(path) ? path : resolve(process.cwd(), path)

  // Read package.json
  const packageJson = new PackageJson()
  const manifest = packageJson.read(packTarget)

  if (!manifest.name || !manifest.version) {
    throw new Error('Package must have a name and version')
  }

  // Generate filename
  const filename = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`

  // If dry run, just return the info
  if (options.dry) {
    return { manifest, filename }
  }

  const cwd = packTarget
  const tarballData = await tarCreate(
    {
      cwd,
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
            // Handle different pattern types
            if (pattern.endsWith('/')) {
              // Directory pattern: match the directory itself and its contents
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
            } else {
              // File pattern: check direct match and if this path is a parent directory
              const directMatch = minimatch(normalizedPath, pattern, {
                dot: true,
              })
              // Check if this path is a directory that could contain the pattern
              const isParentDir =
                pattern.includes('/') &&
                pattern.startsWith(normalizedPath + '/')
              return directMatch || isParentDir
            }
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

  return { manifest, filename, tarballData }
}
