import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'dist-tag',
    usage: [
      'add <pkg>@<version> [<tag>]',
      'rm <pkg> <tag>',
      'ls [<pkg>]',
    ],
    description: `Manage distribution tags for a package.

    Distribution tags (dist-tags) provide aliases for package versions,
    allowing users to install specific versions using tag names instead
    of version numbers. The most common tag is \`latest\`, which is used
    by default when no tag is specified during install.`,
    subcommands: {
      add: {
        usage: '<pkg>@<version> [<tag>]',
        description:
          'Tag the specified version of a package with the given tag, or "latest" if unspecified.',
      },
      rm: {
        usage: '<pkg> <tag>',
        description: 'Remove a dist-tag from a package.',
      },
      ls: {
        usage: '[<pkg>]',
        description:
          'List all dist-tags for a package, defaulting to the package in the current directory.',
      },
    },
    options: {
      registry: {
        value: '<url>',
        description: 'Registry URL to manage dist-tags for.',
      },
      identity: {
        value: '<name>',
        description:
          'Identity namespace used to look up auth tokens.',
      },
    },
  })

export type DistTagLsResult = {
  id: string
  tags: Record<string, string>
}

export type DistTagAddResult = {
  id: string
  tag: string
  version: string
}

export type DistTagRmResult = {
  id: string
  tag: string
}

export type CommandResult =
  | DistTagLsResult
  | DistTagAddResult
  | DistTagRmResult

const isLsResult = (r: CommandResult): r is DistTagLsResult =>
  'tags' in r

const isAddResult = (r: CommandResult): r is DistTagAddResult =>
  'version' in r

export const views = {
  human: result => {
    if (isLsResult(result)) {
      const entries = Object.entries(result.tags)
      if (entries.length === 0) return 'No dist-tags found.'
      return entries
        .map(([tag, version]) => `${tag}: ${version}`)
        .join('\n')
    }
    if (isAddResult(result)) {
      return `+${result.tag}: ${result.id}@${result.version}`
    }
    return `-${result.tag}: ${result.id}`
  },
  json: r => r,
} as const satisfies Views<CommandResult>

/**
 * Build the dist-tags API URL for a package.
 * Uses the `/-/package/{name}/dist-tags` endpoint.
 */
const distTagsUrl = (
  name: string,
  registry: string,
  tag?: string,
): URL => {
  const encoded =
    name.startsWith('@') ? name.replace('/', '%2f') : name
  const path =
    tag ?
      `-/package/${encoded}/dist-tags/${encodeURIComponent(tag)}`
    : `-/package/${encoded}/dist-tags`
  return new URL(path, registry)
}

const readPackageName = (
  positional: string | undefined,
  conf: Parameters<CommandFn>[0],
): string => {
  if (positional) {
    const spec = Spec.parseArgs(positional, conf.options)
    return spec.name
  }
  const manifest = conf.options.packageJson.maybeRead(
    conf.projectRoot,
  )
  if (manifest?.name) return manifest.name
  throw error('Could not determine package name', {
    code: 'EUSAGE',
  })
}

export const command: CommandFn<CommandResult> = async conf => {
  const [sub, ...args] = conf.positionals

  if (!sub) {
    throw error('dist-tag command requires a subcommand', {
      code: 'EUSAGE',
      validOptions: ['add', 'rm', 'remove', 'ls', 'list'],
    })
  }

  const rc = new RegistryClient(conf.options)
  const registry = conf.options.registry

  switch (sub) {
    case 'add': {
      const specArg = args[0]
      if (!specArg) {
        throw error(
          'dist-tag add requires a package@version argument',
          {
            code: 'EUSAGE',
          },
        )
      }

      const spec = Spec.parseArgs(specArg, conf.options)
      const name = spec.name
      const version = spec.bareSpec

      if (!version) {
        throw error('dist-tag add requires a version in the spec', {
          code: 'EUSAGE',
          found: specArg,
        })
      }

      const tag = args[1] ?? conf.options.tag

      const url = distTagsUrl(name, registry, tag)
      const response = await rc.request(url, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(version),
        useCache: false,
      })

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw error('Failed to add dist-tag', {
          url,
          response,
        })
      }

      return { id: name, tag, version }
    }

    case 'rm':
    case 'remove': {
      const pkgArg = args[0]
      const tag = args[1]

      if (!pkgArg || !tag) {
        throw error('dist-tag rm requires a package name and tag', {
          code: 'EUSAGE',
        })
      }

      const name = readPackageName(pkgArg, conf)

      const url = distTagsUrl(name, registry, tag)
      const response = await rc.request(url, {
        method: 'DELETE',
        useCache: false,
      })

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw error('Failed to remove dist-tag', {
          url,
          response,
        })
      }

      return { id: name, tag }
    }

    case 'ls':
    case 'list': {
      const name = readPackageName(args[0], conf)

      const url = distTagsUrl(name, registry)
      const response = await rc.request(url, {
        useCache: false,
      })

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw error('Failed to list dist-tags', {
          url,
          response,
        })
      }

      const tags = response.json() as Record<string, string>

      return { id: name, tags }
    }

    default: {
      throw error('Invalid dist-tag subcommand', {
        found: sub,
        validOptions: ['add', 'rm', 'remove', 'ls', 'list'],
        code: 'EUSAGE',
      })
    }
  }
}
