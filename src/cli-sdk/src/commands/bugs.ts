import { error } from '@vltpkg/error-cause'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Spec } from '@vltpkg/spec'
import { urlOpen } from '@vltpkg/url-open'
import { actual } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { createHostContextsMap } from '../query-host-contexts.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import type { Manifest, NormalizedManifest } from '@vltpkg/types'
import hostedGitInfo from 'hosted-git-info'
const { fromUrl: hostedGitInfoFromUrl } = hostedGitInfo as {
  fromUrl: (url: string) => { bugs?: () => string } | null
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'bugs',
    usage: ['[<spec>]', '[--target=<query>]'],
    description: `Open bug tracker for a package in a web browser.
                  Reads bug tracker information from package.json or fetches
                  manifest data for the specified package.`,
    options: {
      target: {
        value: '<query>',
        description:
          'Query selector to filter packages using DSS syntax.',
      },
    },
    examples: {
      '': {
        description:
          'Open bugs for the current package (reads local package.json)',
      },
      'abbrev@2.0.0': {
        description: 'Open bugs for a specific package version',
      },
      '--target=":root > *"': {
        description:
          'List bug tracker URLs for all direct dependencies',
      },
    },
  })

type CommandResultSingle = {
  url: string
  name: string
}

type CommandResultMultiple = {
  url: string
  name: string
}[]

export type CommandResult =
  | CommandResultSingle
  | CommandResultMultiple

export const views = {
  human: r => {
    if (Array.isArray(r)) {
      let msg = 'Multiple package bug trackers found:\n'
      msg += r.map(item => `• ${item.name}: ${item.url}`).join('\n')
      return msg
    }
    return ''
  },
  json: r => r,
} as const satisfies Views<CommandResult>

const getUrlFromManifest = (
  manifest: Manifest | NormalizedManifest,
): string => {
  const { name, bugs, repository } = manifest

  if (!name) {
    throw error('No package name found')
  }

  let url: string | undefined

  // Check bugs field first
  if (bugs) {
    if (typeof bugs === 'string') {
      url = bugs
    } else if (typeof bugs === 'object') {
      if ('url' in bugs && bugs.url) {
        url = bugs.url
      } else if ('email' in bugs && bugs.email) {
        url = `mailto:${bugs.email}`
      }
    }
  }

  // Try repository if no bugs field
  if (!url && repository) {
    const repoUrl =
      typeof repository === 'string' ? repository
      : typeof repository === 'object' && 'url' in repository ?
        repository.url
      : /* c8 ignore next */ undefined

    if (repoUrl) {
      const info = hostedGitInfoFromUrl(repoUrl.replace(/^git\+/, ''))
      if (info?.bugs && typeof info.bugs === 'function') {
        url = info.bugs()
      }
    }
  }

  // Fallback to vlt.io package page
  if (!url) {
    url = `https://vlt.io/explore/npm/${name}/overview`
  }

  return url
}

export const command: CommandFn<CommandResult> = async conf => {
  const { projectRoot, packageJson } = conf.options
  const targetOption = conf.get('target')

  // Handle --target query
  if (targetOption) {
    const mainManifest = packageJson.maybeRead(projectRoot)
    if (!mainManifest) {
      throw error('No package.json found in project root', {
        path: projectRoot,
      })
    }

    const graph = actual.load({
      ...conf.options,
      mainManifest,
      monorepo: conf.options.monorepo,
      loadManifests: true,
    })

    const securityArchive =
      Query.hasSecuritySelectors(targetOption) ?
        await SecurityArchive.start({
          nodes: [...graph.nodes.values()],
        })
      : undefined

    const hostContexts = await createHostContextsMap(conf)
    const query = new Query({
      nodes: new Set(graph.nodes.values()),
      edges: graph.edges,
      importers: graph.importers,
      securityArchive,
      hostContexts,
    })

    const { nodes } = await query.search(targetOption, {
      signal: new AbortController().signal,
    })

    const results: CommandResultMultiple = []
    for (const node of nodes) {
      if (!node.manifest) continue
      const url = getUrlFromManifest(node.manifest)
      results.push({
        url,
        name: node.name /* c8 ignore next */ ?? '(unknown)',
      })
    }

    if (results.length === 0) {
      throw error('No packages found matching target query', {
        found: targetOption,
      })
    }

    // If single result, open it
    if (results.length === 1) {
      const result = results[0]
      /* c8 ignore next 3 */
      if (!result) {
        throw error('Unexpected empty result')
      }
      await urlOpen(result.url)
      return result
    }

    // Multiple results, return the list
    return results
  }

  // read the package spec from a positional argument or local package.json
  const specArg = conf.positionals[0]
  const manifest =
    conf.positionals.length === 0 ? packageJson.read(projectRoot)
    : specArg ?
      await new PackageInfoClient(conf.options).manifest(
        Spec.parseArgs(specArg, conf.options),
      )
    : /* c8 ignore next */ packageJson.read(projectRoot)

  const url = getUrlFromManifest(manifest)
  const { name } = manifest
  /* c8 ignore start - getUrlFromManifest already validates name */
  if (!name) {
    throw error('No package name found')
  }
  /* c8 ignore stop */
  // Open the URL
  await urlOpen(url)

  return { url, name }
}
