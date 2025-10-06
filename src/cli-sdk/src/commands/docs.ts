import { error } from '@vltpkg/error-cause'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Spec } from '@vltpkg/spec'
import { urlOpen } from '@vltpkg/url-open'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import hostedGitInfo from 'hosted-git-info'
const { fromUrl: hostedGitInfoFromUrl } = hostedGitInfo

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'docs',
    usage: ['[<spec>]'],
    description: `Open documentation for a package in a web browser.
                  Reads repository information from package.json or fetches
                  manifest data for the specified package.`,
    examples: {
      '': {
        description:
          'Open docs for the current package (reads local package.json)',
      },
      'abbrev@2.0.0': {
        description: 'Open docs for a specific package version',
      },
    },
  })

type CommandResult = {
  url: string
  name: string
}

export const views = {
  human: r => r.url,
  json: r => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const { projectRoot, packageJson } = conf.options

  // No args - read from local package.json
  const manifest =
    conf.positionals.length === 0 ?
      packageJson.read(projectRoot)
    : await new PackageInfoClient(conf.options).manifest(
        Spec.parse(
          /* c8 ignore next */ conf.positionals[0] ?? '',
          conf.options,
        ),
      )

  const { name, repository } = manifest

  if (!name) {
    throw error('No package name found', {
      code: 'EINVAL',
    })
  }

  // Extract repository URL
  let url: string | undefined

  if (repository) {
    const repoUrl =
      typeof repository === 'string' ? repository
      : typeof repository === 'object' && 'url' in repository ?
        repository.url
      : /* c8 ignore next */
        undefined

    if (repoUrl) {
      // Try to get hosted git info

      const info = hostedGitInfoFromUrl(repoUrl.replace(/^git\+/, ''))

      if (info && typeof info.docs === 'function') {
        url = info.docs()
      }
    }
  }

  // Fallback to npmjs.com package page
  if (!url) {
    url = `https://www.npmjs.com/package/${name}`
  }

  // Open the URL
  await urlOpen(url)

  return { url, name }
}
