import {
  inc,
  parse as parseVersion,
  versionIncrements,
} from '@vltpkg/semver'
import type { IncrementType } from '@vltpkg/semver'
import { is as isGit, spawn as spawn_, isClean } from '@vltpkg/git'
import type { GitOptions } from '@vltpkg/git'
import { error } from '@vltpkg/error-cause'
import { asError } from '@vltpkg/types'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import type { ParsedConfig } from '../config/index.ts'
import { dirname } from 'node:path'
import assert from 'node:assert'

export type VersionOptions = {
  prereleaseId?: string
  commit?: boolean
  tag?: boolean
  message?: string
  tagMessage?: string
}

export type VersionResult = {
  oldVersion: string
  newVersion: string
  dir: string
  committed?: string[]
  tag?: string
}

const isValidVersionIncrement = (
  value: string,
): value is IncrementType =>
  versionIncrements.includes(value as IncrementType)

const version = async (
  conf: ParsedConfig,
  increment: string | undefined,
  cwd: string,
  {
    // Hardcode happy path options for now.
    // TODO: make these config definitions
    prereleaseId = 'pre',
    commit = true,
    tag = true,
    message = 'v%s',
    tagMessage = 'v%s',
  }: VersionOptions = {},
): Promise<VersionResult> => {
  assert(
    increment,
    error('Version increment argument is required', {
      code: 'EUSAGE',
      validOptions: versionIncrements,
    }),
  )

  const manifestPath = conf.options.packageJson.find(cwd)
  assert(
    manifestPath,
    error('No package.json found', {
      code: 'ENOENT',
      path: cwd,
    }),
  )

  const spawn = (args: string[], opts?: GitOptions) =>
    spawn_(args, { cwd: manifestDir, ...opts })

  const manifestDir = dirname(manifestPath)
  const manifest = conf.options.packageJson.read(manifestDir)

  assert(
    manifest.version,
    error('No version field found in package.json', {
      path: manifestPath,
    }),
  )

  const oldVersion = manifest.version
  let newVersion: string

  // Check if increment is a valid semver version string
  const parsedIncrement = parseVersion(increment)
  if (parsedIncrement) {
    newVersion = parsedIncrement.toString()
  } else if (isValidVersionIncrement(increment)) {
    // Use semver increment
    const incrementType = increment
    try {
      const result = inc(oldVersion, incrementType, prereleaseId)
      newVersion = result.toString()
    } catch (err) {
      throw error(
        `Failed to increment version from ${oldVersion} with ${increment}`,
        { version: oldVersion, wanted: increment, cause: err },
      )
    }
  } else {
    throw error(
      `Invalid version increment: ${increment}. Must be a valid semver version or one of: major, minor, patch, premajor, preminor, prepatch, prerelease`,
      {
        found: increment,
        validOptions: versionIncrements,
      },
    )
  }

  // Update the manifest
  manifest.version = newVersion
  conf.options.packageJson.write(manifestDir, manifest)

  const result: VersionResult = {
    oldVersion,
    newVersion,
    dir: manifestDir,
  }

  // Handle git operations if we're in a git repository
  if (
    /* c8 ignore next -- commit and tag are always true for now */
    (commit || tag) &&
    (await isGit({ cwd: conf.options.projectRoot }))
  ) {
    // Check for uncommitted changes (excluding package.json since we just modified it)
    if (!(await isClean({ cwd: conf.options.projectRoot }))) {
      try {
        // Check if there are changes other than package.json
        const gitResult = await spawn(['diff', '--name-only', 'HEAD'])
        const changedFiles = gitResult.stdout
          .trim()
          .split('\n')
          .filter(Boolean)
        const nonPackageJsonChanges = changedFiles.filter(
          file => file !== 'package.json',
        )
        assert(
          nonPackageJsonChanges.length === 0,
          error(
            'Git working directory not clean. Please commit or stash your changes first.',
            { found: nonPackageJsonChanges },
          ),
        )
      } catch (err) {
        throw error(
          'Git working directory not clean. Please commit or stash your changes first.',
          asError(err),
        )
      }
    }

    if (commit) {
      try {
        // Stage package.json
        const files = ['package.json']
        await spawn(['add', ...files])
        await spawn([
          'commit',
          '-m',
          message.replace('%s', newVersion),
        ])
        result.committed = files
      } catch (err) {
        throw error('Failed to commit version changes', {
          version: newVersion,
          cause: err,
        })
      }
    }

    if (tag) {
      try {
        const tagName = `v${newVersion}`
        await spawn([
          'tag',
          tagName,
          '-m',
          tagMessage.replace('%s', newVersion),
        ])
        result.tag = tagName
      } catch (err) {
        throw error('Failed to create git tag', {
          version: newVersion,
          cause: err,
        })
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
  })
}

export const views = {
  json: result => result,
  human: result => {
    let output = `v${result.newVersion}`
    if (result.committed) {
      output += ` +commit`
    }
    if (result.tag) {
      output += ` +tag`
    }
    return output
  },
} as const satisfies Views<VersionResult>

export const command: CommandFn<VersionResult> = async conf => {
  const { positionals } = conf
  return version(conf, positionals[0], process.cwd())
}
