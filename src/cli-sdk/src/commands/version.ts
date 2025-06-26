import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import { PackageJson } from '@vltpkg/package-json'
import { inc, parse as parseVersion } from '@vltpkg/semver'
import type { IncrementType } from '@vltpkg/semver'
import { is as isGit, spawn, isClean } from '@vltpkg/git'
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

const versionImpl = async (
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
      versionImpl,
    )
  }

  const packageJson = new PackageJson()
  const manifest = packageJson.read(cwd)

  if (!manifest.version) {
    throw error(
      'No version field found in package.json',
      { path: packageJsonPath },
      versionImpl,
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
        versionImpl,
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
      versionImpl,
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
  const inGitRepo = await isGit({ cwd })
  if (inGitRepo && (commit || tag)) {
    // Check for uncommitted changes (excluding package.json since we just modified it)
    const hasChanges = !(await isClean({ cwd }))
    if (hasChanges) {
      try {
        // Check if there are changes other than package.json
        const gitResult = await spawn(
          ['diff', '--name-only', 'HEAD'],
          { cwd },
        )
        const changedFiles = gitResult.stdout
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
            versionImpl,
          )
        }
      } catch (err) {
        // If we can't determine the changed files, be conservative
        throw error(
          'Git working directory not clean. Please commit or stash your changes first.',
          { cause: err },
          versionImpl,
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
          versionImpl,
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
          versionImpl,
        )
      }
    }
  }

  return result
}

export const usage: CommandUsage = () => {
  return commandUsage({
    command: 'version',
    usage:
      '[<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease]',
    description: `Bump a package's version.

    Run in a package directory to bump the version and write the new data back to package.json.

    The \`<newversion>\` argument should be a valid semver string or a valid increment type (one of patch, minor, major, prepatch, preminor, premajor, prerelease).

    If run in a git repository, it will also create a version commit and tag.`,
    examples: {
      'vlt version patch': {
        description: 'Increment the patch version',
      },
      'vlt version minor': {
        description: 'Increment the minor version',
      },
      'vlt version major': {
        description: 'Increment the major version',
      },
      'vlt version prerelease': {
        description: 'Increment the prerelease version',
      },
      'vlt version 1.2.3': {
        description: 'Set the version to 1.2.3',
      },
    },
  })
}

export const views = {
  human: (result: VersionResult, _options, _config) => {
    const output: string[] = []

    output.push(`v${result.newVersion}`)

    if (result.committed && result.tagged) {
      output.push(`Created git commit and tag v${result.newVersion}`)
    } else if (result.committed) {
      output.push(`Created git commit`)
    } else if (result.tagged) {
      output.push(`Created git tag v${result.newVersion}`)
    }

    return output.join('\n')
  },
} as const satisfies Views<VersionResult>

export const command: CommandFn<VersionResult> = async conf => {
  const positionals = conf.positionals.filter(
    arg => !arg.startsWith('-'),
  )

  if (positionals.length === 0) {
    throw new Error('Version increment argument is required')
  }

  const increment = positionals[0]
  if (!increment) {
    throw new Error('Version increment argument is required')
  }

  if (increment === 'from-git') {
    throw new Error('from-git version increment is not supported')
  }

  return await versionImpl(increment, {
    cwd: process.cwd(),
    commit: true,
    tag: true,
  })
}
