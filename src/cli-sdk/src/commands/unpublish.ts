import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import { asError } from '@vltpkg/types'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'unpublish',
    usage: ['<package>@<version>', '<package> --force'],
    description: `Remove a package version from the registry.

    To unpublish a single version, specify the package name and version.
    To unpublish an entire package, specify the package name and use --force.

    ⚠️  Unpublishing is a destructive action that cannot be undone.
    Consider using \`vlt deprecate\` instead if you want to discourage
    usage of a package without removing it.`,
    examples: {
      'my-package@1.0.0': {
        description: 'Unpublish a specific version',
      },
      '@scope/my-package@1.0.0': {
        description: 'Unpublish a specific version of a scoped package',
      },
      'my-package --force': {
        description: 'Unpublish an entire package (requires --force)',
      },
    },
    options: {
      force: {
        description:
          'Required to unpublish an entire package (all versions).',
      },
      otp: {
        description: 'Provide a one-time password for authentication.',
        value: '<otp>',
      },
    },
  })

export type CommandResult = {
  /** The package name */
  name: string
  /** The version that was unpublished, or undefined for entire package */
  version?: string
  /** The registry URL */
  registry: string
}

export const views = {
  human: (result: CommandResult) => {
    if (result.version) {
      return `⚠️  ${result.name}@${result.version} has been unpublished from ${result.registry}.`
    }
    return `⚠️  ${result.name} (all versions) has been unpublished from ${result.registry}.`
  },
  json: (r: CommandResult) => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const specArg = conf.positionals[0]

  if (!specArg) {
    throw error(
      'unpublish requires a package spec argument (e.g. pkg@version)',
      { code: 'EUSAGE' },
    )
  }

  const { registry, otp, force } = conf.options
  const registryUrl = new URL(registry)

  const spec = Spec.parseArgs(specArg, conf.options)
  const name = spec.name

  if (!name) {
    throw error('Package name is required', {
      found: specArg,
    })
  }

  const version = spec.bareSpec

  // If no version specified, require --force to unpublish the entire package
  if (!version) {
    if (!force) {
      throw error(
        'Refusing to unpublish entire package without --force.\n' +
          'To unpublish a specific version, use: vlt unpublish <package>@<version>\n' +
          'To unpublish all versions, use: vlt unpublish <package> --force',
      )
    }
  }

  const rc = new RegistryClient(conf.options)

  const encodedName =
    name.startsWith('@') ? name.replace('/', '%2F') : name

  if (version) {
    // Unpublish a specific version:
    // 1. Fetch the packument
    // 2. Remove the version from the packument
    // 3. PUT the updated packument back
    const packumentUrl = new URL(encodedName, registryUrl)

    let packumentResponse
    try {
      packumentResponse = await rc.request(packumentUrl, {
        useCache: false,
      })
    } catch (err) {
      throw error('Failed to fetch package metadata', {
        cause: asError(err),
      })
    }

    if (packumentResponse.statusCode !== 200) {
      throw error('Package not found on the registry', {
        url: packumentUrl,
        response: packumentResponse,
      })
    }

    const packument = packumentResponse.json() as Record<
      string,
      unknown
    >
    const versions = packument.versions as
      | Record<string, unknown>
      | undefined
    const distTags = packument['dist-tags'] as
      | Record<string, string>
      | undefined

    if (!versions?.[version]) {
      throw error(`Version ${version} not found in package ${name}`, {
        found: version,
        wanted: Object.keys(versions ?? {}),
      })
    }

    // Remove the version
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete versions[version]

    // Remove any dist-tags pointing to this version
    if (distTags) {
      for (const [tag, tagVersion] of Object.entries(distTags)) {
        if (tagVersion === version) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete distTags[tag]
        }
      }
    }

    // Remove the version from the time field if present
    const time = packument.time as
      | Record<string, string>
      | undefined
    if (time?.[version]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete time[version]
    }

    // PUT the updated packument
    const putUrl = new URL(
      `${encodedName}/-rev/${packument._rev as string}`,
      registryUrl,
    )

    let response
    try {
      response = await rc.request(putUrl, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'npm-auth-type': 'web',
          'npm-command': 'unpublish',
        },
        body: JSON.stringify(packument),
        otp,
      })
    } catch (err) {
      throw error('Failed to unpublish package version', {
        cause: asError(err),
      })
    }

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw error('Failed to unpublish package version', {
        url: putUrl,
        response,
      })
    }
  } else {
    // Unpublish entire package — DELETE the packument
    // First fetch the packument to get the _rev
    const packumentUrl = new URL(encodedName, registryUrl)

    let packumentResponse
    try {
      packumentResponse = await rc.request(packumentUrl, {
        useCache: false,
      })
    } catch (err) {
      throw error('Failed to fetch package metadata', {
        cause: asError(err),
      })
    }

    if (packumentResponse.statusCode !== 200) {
      throw error('Package not found on the registry', {
        url: packumentUrl,
        response: packumentResponse,
      })
    }

    const packument = packumentResponse.json() as Record<
      string,
      unknown
    >

    const deleteUrl = new URL(
      `${encodedName}/-rev/${packument._rev as string}`,
      registryUrl,
    )

    let response
    try {
      response = await rc.request(deleteUrl, {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
          'npm-auth-type': 'web',
          'npm-command': 'unpublish',
        },
        otp,
      })
    } catch (err) {
      throw error('Failed to unpublish package', {
        cause: asError(err),
      })
    }

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw error('Failed to unpublish package', {
        url: deleteUrl,
        response,
      })
    }
  }

  return {
    name,
    ...(version ? { version } : {}),
    registry: registryUrl.origin,
  }
}
