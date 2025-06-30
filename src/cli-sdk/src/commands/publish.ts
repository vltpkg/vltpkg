import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import type { CacheEntry } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { packTarball } from '../pack-tarball.ts'
import type { Views } from '../view.ts'
import * as ssri from 'ssri'
import assert from 'node:assert'
import { asError } from '@vltpkg/types'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'publish',
    usage: ['[<folder>]'],
    description: `Create a tarball from a package and publish it to the configured registry.
    
    This command will pack the package in the current directory or specified folder,
    and then upload it to the configured registry.`,
    options: {
      tag: {
        description: 'Publish the package with the given tag',
        value: '<tag>',
      },
      access: {
        description: 'Set access level (public or restricted)',
        value: '<level>',
      },
      otp: {
        description:
          'One-time password for two-factor authentication',
        value: '<code>',
      },
    },
  })

type CommandResult = {
  id: string
  name: string
  version: string
  tag: string
  registry: string
  shasum?: string
  integrity?: string
  size: number
}

export const views = {
  human: r => {
    const lines = [
      `✅ Published ${r.name}@${r.version}`,
      `📦 Package: ${r.id}`,
      `🏷️ Tag: ${r.tag}`,
      `📡 Registry: ${r.registry}`,
      `📊 Size: ${formatSize(r.size)}`,
    ]
    if (r.shasum) lines.push(`🔒 Shasum: ${r.shasum}`)
    if (r.integrity) lines.push(`🔐 Integrity: ${r.integrity}`)
    return lines.join('\n')
  },
  json: r => r,
} as const satisfies Views<CommandResult>

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

export const command: CommandFn<CommandResult> = async conf => {
  const [folder = '.'] = conf.positionals

  // Pack tarball using our internal function
  const { manifest, tarballData } = await packTarball(folder, {
    projectRoot: conf.projectRoot,
  })

  assert(
    manifest.name && manifest.version,
    error('Package must have a name and version'),
  )
  assert(tarballData, error('Failed to create tarball'))

  // Check if package is private
  if (manifest.private) {
    throw error(
      `This package has been marked as private\nRemove the 'private' field from the package.json to publish it.`,
    )
  }

  const registry = conf.options.registry
  const registryUrl = new URL(registry)

  // Generate integrity hash
  const integrity = ssri.fromData(tarballData, {
    algorithms: [...new Set(['sha1', 'sha512'])],
  })

  const name = manifest.name
  const version = manifest.version
  const tag = conf.options.tag || 'latest'

  // Build tarball URL like npm does
  const tarballName = `${name}-${version}.tgz`
  const tarballURI = `${name}/-/${tarballName}`

  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const integrity512 = integrity.sha512?.[0]?.toString()
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const shasum = integrity.sha1?.[0]?.hexDigest() as string

  // Patch manifest like npm does
  const patchedManifest = {
    ...manifest,
    _id: `${name}@${version}`,
    _nodeVersion: process.versions.node,
    dist: {
      ...manifest.dist,
      integrity: integrity512,
      shasum,
      tarball: new URL(tarballURI, registryUrl).href,
    },
  }

  // Build metadata structure exactly like npm
  const publishMetadata = {
    _id: name,
    name,
    description: manifest.description || '',
    'dist-tags': {
      [tag]: version,
    },
    versions: {
      [version]: patchedManifest,
    },
    access: null,
    _attachments: {
      [tarballName]: {
        content_type: 'application/octet-stream',
        data: tarballData.toString('base64'),
        length: tarballData.length,
      },
    },
  }

  // Use the package name for the URL (scoped packages should work automatically)
  const escapedName =
    name.startsWith('@') ? name.replace('/', '%2F') : name
  const publishUrl = new URL(escapedName, registryUrl)

  // Publish using our registry client with proper headers
  const rc = new RegistryClient(conf.options)

  let response: CacheEntry
  try {
    response = await rc.request(publishUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'npm-auth-type': 'web',
        'npm-command': 'publish',
      },
      body: JSON.stringify(publishMetadata),
    })
  } catch (err) {
    throw error('Failed to publish package', {
      cause: asError(err),
    })
  }

  if (response.statusCode !== 200 && response.statusCode !== 201) {
    throw error('Failed to publish package', {
      response,
    })
  }

  return {
    id: `${name}@${version}`,
    name,
    version,
    tag,
    registry: registryUrl.origin,
    integrity: integrity512,
    shasum,
    size: tarballData.length,
  }
}
