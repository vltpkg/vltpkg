import { error } from '@vltpkg/error-cause'
import { PackageInfoClient } from '@vltpkg/package-info'
import { RegistryClient } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import { satisfies } from '@vltpkg/semver'
import { asError } from '@vltpkg/types'
import type { Manifest } from '@vltpkg/types'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'deprecate',
    usage: '<pkg>[@<version>] <message>',
    description: `Update the npm registry entry for a package, providing a
                  deprecation warning to all who attempt to install it.

                  It works on version ranges as well as specific versions,
                  so you can un-deprecate a previously deprecated package by
                  specifying the version range with an empty string as the
                  message.`,
    examples: {
      'my-package "this package is no longer maintained"': {
        description: 'Deprecate all versions of a package',
      },
      'my-package@"<0.2.0" "critical bug, please update"': {
        description: 'Deprecate specific versions',
      },
      'my-package ""': {
        description: 'Un-deprecate a package',
      },
    },
    options: {
      registry: {
        value: '<url>',
        description: 'The registry to update.',
      },
      otp: {
        description: `Provide an OTP to use when deprecating a package.`,
        value: '<otp>',
      },
    },
  })

export type CommandResult = {
  name: string
  version: string
  message: string
  versions: string[]
}

export const views = {
  human: result => {
    if (result.message === '') {
      return `✅ Un-deprecated ${result.name}@${result.version} (${result.versions.length} version${result.versions.length === 1 ? '' : 's'})`
    }
    return `⚠️ Deprecated ${result.name}@${result.version} (${result.versions.length} version${result.versions.length === 1 ? '' : 's'}): ${result.message}`
  },
  json: r => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const specArg = conf.positionals[0]
  const message = conf.positionals[1]

  if (!specArg) {
    throw error(
      'deprecate requires a package spec and message argument',
      {
        code: 'EUSAGE',
      },
    )
  }

  if (message === undefined) {
    throw error('deprecate requires a message argument', {
      code: 'EUSAGE',
    })
  }

  const spec = Spec.parseArgs(specArg, conf.options)
  const { name } = spec

  if (!name || name === '(unknown)') {
    throw error('could not determine package name from spec', {
      found: specArg,
    })
  }

  const { registry, otp } = conf.options
  const registryUrl = new URL(registry)

  // Fetch the current packument
  const pic = new PackageInfoClient(conf.options)
  const packument = await pic.packument(spec)

  // Determine which versions match the spec
  const versionRange = spec.bareSpec
  const matchedVersions: string[] = []

  for (const version of Object.keys(packument.versions)) {
    if (!versionRange || satisfies(version, versionRange)) {
      matchedVersions.push(version)
    }
  }

  if (matchedVersions.length === 0) {
    throw error('no versions found matching the spec', {
      found: specArg,
      wanted: Object.keys(packument.versions),
    })
  }

  // Build the update payload with deprecated field set on matched versions
  const versions: Record<string, Manifest> = {}
  for (const version of matchedVersions) {
    const manifest = packument.versions[version]
    /* c8 ignore next */
    if (!manifest) continue
    versions[version] = {
      ...manifest,
      ...(message === '' ?
        { deprecated: undefined }
      : { deprecated: message }),
    }
  }

  const body = {
    _id: name,
    name,
    versions,
  }

  const rc = new RegistryClient(conf.options)
  const packageUrl = new URL(
    name.startsWith('@') ? name.replace('/', '%2F') : name,
    registryUrl,
  )

  let response
  try {
    response = await rc.request(packageUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'npm-auth-type': 'web',
        'npm-command': 'deprecate',
      },
      body: JSON.stringify(body),
      otp,
    })
  } catch (err) {
    throw error('failed to update deprecation status', {
      cause: asError(err),
    })
  }

  if (response.statusCode !== 200 && response.statusCode !== 201) {
    throw error('failed to update deprecation status', {
      url: packageUrl,
      response,
    })
  }

  return {
    name,
    version: versionRange || '*',
    message,
    versions: matchedVersions,
  }
}
