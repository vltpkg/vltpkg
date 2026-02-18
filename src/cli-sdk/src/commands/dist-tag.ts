import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import type { JSONField } from '@vltpkg/types'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'dist-tag',
    usage: [
      'add <package>@<version> <tag>',
      'rm <package> <tag>',
      'ls [<package>]',
    ],
    description: `Manage distribution tags for packages in the registry.
    
    Distribution tags (dist-tags) are human-readable labels that can be used to
    organize and label different versions of packages published to the registry.
    
    Subcommands:
      add    Add or update a dist-tag to point to a specific version
      rm     Remove a dist-tag from a package
      ls     List all dist-tags for a package`,
    options: {
      registry: {
        value: '<url>',
        description: 'Registry URL to manage dist-tags in.',
      },
      identity: {
        value: '<name>',
        description:
          'Identity namespace used to look up auth tokens.',
      },
    },
  })

type CommandResult = {
  action: 'ls' | 'add' | 'rm'
  package: string
  tag?: string
  version?: string
  tags?: Record<string, JSONField>
}

export const views = {
  human: r => {
    if (r.action === 'ls' && r.tags) {
      const entries = Object.entries(r.tags)
      if (entries.length === 0) {
        return `No dist-tags for ${r.package}`
      }
      return entries
        .map(([tag, version]) => {
          let versionStr: string
          if (typeof version === 'string') {
            versionStr = version
          } else if (
            typeof version === 'number' ||
            typeof version === 'boolean'
          ) {
            versionStr = String(version)
          } else {
            versionStr = '[object]'
          }
          return `${tag}: ${versionStr}`
        })
        .join('\n')
    } else if (r.action === 'add') {
      return `+${r.tag} → ${r.package}@${r.version}`
    } else if (r.action === 'rm') {
      return `-${r.tag} from ${r.package}`
    }
    return r
  },
  json: r => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const subcommand = conf.positionals[0]
  const rc = new RegistryClient(conf.options)
  const registry = conf.options.registry

  switch (subcommand) {
    case 'ls': {
      // vlt dist-tag ls [<package>]
      const pkg = conf.positionals[1]
      if (!pkg) {
        throw error('Package name required for dist-tag ls', {
          code: 'EUSAGE',
        })
      }

      const encodedPkg = encodeURIComponent(pkg)
      const url = new URL(
        `-/package/${encodedPkg}/dist-tags`,
        registry,
      )
      const response = await rc.request(url, { useCache: false })
      const tags = response.json() as Record<string, JSONField>

      return {
        action: 'ls',
        package: pkg,
        tags,
      }
    }

    case 'add': {
      // vlt dist-tag add <package>@<version> <tag>
      const pkgSpec = conf.positionals[1]
      const tag = conf.positionals[2]

      if (!pkgSpec || !tag) {
        throw error('Usage: dist-tag add <package>@<version> <tag>', {
          code: 'EUSAGE',
        })
      }

      // Parse package@version
      const atIndex = pkgSpec.lastIndexOf('@')
      if (atIndex === -1 || atIndex === 0) {
        throw error(
          'Invalid package specifier. Use <package>@<version>',
          {
            found: pkgSpec,
            code: 'EUSAGE',
          },
        )
      }

      const pkg = pkgSpec.slice(0, atIndex)
      const version = pkgSpec.slice(atIndex + 1)

      if (!pkg || !version) {
        throw error(
          'Invalid package specifier. Use <package>@<version>',
          {
            found: pkgSpec,
            code: 'EUSAGE',
          },
        )
      }

      const encodedPkg = encodeURIComponent(pkg)
      const url = new URL(
        `-/package/${encodedPkg}/dist-tags/${tag}`,
        registry,
      )
      await rc.request(url, {
        method: 'PUT',
        useCache: false,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(version),
      })

      return {
        action: 'add',
        package: pkg,
        tag,
        version,
      }
    }

    case 'rm': {
      // vlt dist-tag rm <package> <tag>
      const pkg = conf.positionals[1]
      const tag = conf.positionals[2]

      if (!pkg || !tag) {
        throw error('Usage: dist-tag rm <package> <tag>', {
          code: 'EUSAGE',
        })
      }

      const encodedPkg = encodeURIComponent(pkg)
      const url = new URL(
        `-/package/${encodedPkg}/dist-tags/${tag}`,
        registry,
      )
      await rc.request(url, {
        method: 'DELETE',
        useCache: false,
      })

      return {
        action: 'rm',
        package: pkg,
        tag,
      }
    }

    default: {
      throw error('Invalid dist-tag subcommand', {
        found: subcommand,
        validOptions: ['add', 'rm', 'ls'],
        code: 'EUSAGE',
      })
    }
  }
}
