import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { version } from '@vltpkg/version'
import type { VersionResult } from '@vltpkg/version'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () => {
  return commandUsage({
    command: 'version',
    usage:
      '[<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease]',
    description: `Bump a package's version`,
    examples: [
      'vlt version patch',
      'vlt version minor',
      'vlt version major',
      'vlt version prerelease',
      'vlt version 1.2.3',
    ],
    help: `
Run in a package directory to bump the version and write the new data back to package.json.

The newversion argument should be a valid semver string, a valid second argument to semver.inc (one of patch, minor, major, prepatch, preminor, premajor, prerelease), or from-git.

If run in a git repository, it will also create a version commit and tag.

version arguments:
  <newversion>  A valid semver version string
  major         Increment the major version (1.0.0 -> 2.0.0)
  minor         Increment the minor version (1.0.0 -> 1.1.0)  
  patch         Increment the patch version (1.0.0 -> 1.0.1)
  premajor      Increment to next major prerelease (1.0.0 -> 2.0.0-0)
  preminor      Increment to next minor prerelease (1.0.0 -> 1.1.0-0)
  prepatch      Increment to next patch prerelease (1.0.0 -> 1.0.1-0)  
  prerelease    Increment the prerelease version (1.0.0-0 -> 1.0.0-1)
`,
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

export const command: CommandFn<VersionResult> = async args => {
  const positionals = args.filter(arg => !arg.startsWith('-'))

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

  return await version(increment, {
    cwd: process.cwd(),
    commit: true,
    tag: true,
  })
}
