import { PackageJson } from '@vltpkg/package-json'
import { inc, parse as parseVersion } from '@vltpkg/semver'
import type { IncrementType } from '@vltpkg/semver'
import { spawn } from '@vltpkg/git'
import { error } from '@vltpkg/error-cause'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

export type VersionIncrementType =
  | 'major'
  | 'minor'
  | 'patch'
  | 'premajor'
  | 'preminor'
  | 'prepatch'
  | 'prerelease'

export type VersionOptions = {
  cwd?: string
  prereleaseId?: string
  commit?: boolean
  tag?: boolean
  gitTagVersion?: boolean
  message?: string
}

export type VersionResult = {
  oldVersion: string
  newVersion: string
  packageJsonPath: string
  committed?: boolean
  tagged?: boolean
}

const isValidVersionIncrement = (
  value: string,
): value is VersionIncrementType => {
  return [
    'major',
    'minor',
    'patch',
    'premajor',
    'preminor',
    'prepatch',
    'prerelease',
  ].includes(value)
}

const isInGitRepository = async (cwd: string): Promise<boolean> => {
  try {
    await spawn(['rev-parse', '--git-dir'], { cwd })
    return true
  } catch {
    return false
  }
}

const hasUncommittedChanges = async (
  cwd: string,
): Promise<boolean> => {
  try {
    const result = await spawn(['status', '--porcelain'], { cwd })
    return result.stdout.trim() !== ''
  } catch {
    return false
  }
}

export const version = async (
  increment: string,
  options: VersionOptions = {},
): Promise<VersionResult> => {
  const {
    cwd = process.cwd(),
    prereleaseId,
    commit = true,
    tag = true,
    gitTagVersion = true,
    message = 'v%s',
  } = options

  const packageJsonPath = resolve(cwd, 'package.json')

  if (!existsSync(packageJsonPath)) {
    throw error(
      'No package.json found',
      { path: packageJsonPath },
      version,
    )
  }

  const packageJson = new PackageJson()
  const manifest = packageJson.read(cwd)

  if (!manifest.version) {
    throw error(
      'No version field found in package.json',
      { path: packageJsonPath },
      version,
    )
  }

  const oldVersion = manifest.version
  let newVersion: string

  // Check if increment is a valid semver version string
  const parsedIncrement = parseVersion(increment)
  if (parsedIncrement) {
    newVersion = increment
  } else if (isValidVersionIncrement(increment)) {
    // Use semver increment
    const incrementType = increment as IncrementType
    try {
      const result = inc(oldVersion, incrementType, prereleaseId)
      newVersion = result.toString()
    } catch (err) {
      throw error(
        `Failed to increment version from ${oldVersion} with ${increment}`,
        { version: oldVersion, wanted: increment, cause: err },
        version,
      )
    }
  } else {
    throw error(
      `Invalid version increment: ${increment}. Must be a valid semver version or one of: major, minor, patch, premajor, preminor, prepatch, prerelease`,
      {
        found: increment,
        validOptions: [
          'major',
          'minor',
          'patch',
          'premajor',
          'preminor',
          'prepatch',
          'prerelease',
        ],
      },
      version,
    )
  }

  // Update the manifest
  manifest.version = newVersion
  packageJson.write(cwd, manifest)

  const result: VersionResult = {
    oldVersion,
    newVersion,
    packageJsonPath,
  }

  // Handle git operations if we're in a git repository
  const inGitRepo = await isInGitRepository(cwd)
  if (inGitRepo && (commit || tag)) {
    // Check for uncommitted changes (excluding package.json since we just modified it)
    const hasChanges = await hasUncommittedChanges(cwd)
    if (hasChanges) {
      try {
        // Check if there are changes other than package.json
        const result = await spawn(['diff', '--name-only', 'HEAD'], {
          cwd,
        })
        const changedFiles = result.stdout
          .trim()
          .split('\n')
          .filter(Boolean)
        const nonPackageJsonChanges = changedFiles.filter(
          (file: string) => !file.endsWith('package.json'),
        )

        if (nonPackageJsonChanges.length > 0) {
          throw error(
            'Git working directory not clean. Please commit or stash your changes first.',
            { found: nonPackageJsonChanges },
            version,
          )
        }
      } catch (err) {
        // If we can't determine the changed files, be conservative
        throw error(
          'Git working directory not clean. Please commit or stash your changes first.',
          { cause: err },
          version,
        )
      }
    }

    if (commit) {
      try {
        // Stage package.json
        await spawn(['add', 'package.json'], { cwd })

        // Commit with the specified message
        const commitMessage = message.replace('%s', newVersion)
        await spawn(['commit', '-m', commitMessage], { cwd })
        result.committed = true
      } catch (err) {
        throw error(
          'Failed to commit version changes',
          { version: newVersion, cause: err },
          version,
        )
      }
    }

    if (tag) {
      try {
        const tagName = gitTagVersion ? `v${newVersion}` : newVersion
        await spawn(['tag', tagName], { cwd })
        result.tagged = true
      } catch (err) {
        throw error(
          'Failed to create git tag',
          { version: newVersion, cause: err },
          version,
        )
      }
    }
  }

  return result
}
