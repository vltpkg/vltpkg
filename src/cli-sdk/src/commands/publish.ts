import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { packTarball } from '../pack-tarball.ts'
import type { Views } from '../view.ts'

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
        description: 'One-time password for two-factor authentication',
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
  human: (r: CommandResult) => {
    const lines = [
      `✅ Published ${r.name}@${r.version}`,
      `📦 Package: ${r.id}`,
      `🏷️  Tag: ${r.tag}`,
      `📡 Registry: ${r.registry}`,
      `📊 Size: ${formatSize(r.size)}`,
    ]
    if (r.shasum) lines.push(`🔒 Shasum: ${r.shasum}`)
    if (r.integrity) lines.push(`🔐 Integrity: ${r.integrity}`)
    return lines.join('\n')
  },
  json: (r: CommandResult) => r,
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
  
  // Pack the tarball
  const { manifest, filename, tarballData } = await packTarball(folder, {
    projectRoot: conf.projectRoot,
  })
  
  if (!manifest.name || !manifest.version) {
    throw error('Package must have a name and version to publish', {
      code: 'EINVAL',
    })
  }
  
  if (!tarballData) {
    throw error('Failed to create tarball', {
      code: 'EINVAL',
    })
  }
  
  // Get the registry URL
  const registry = conf.options.registry as string
  const registryUrl = new URL(registry)
  
  // TODO: Handle scoped packages properly
  const packageUrl = new URL(`/${manifest.name}`, registryUrl)
  
  // Create the publish metadata
  const publishMetadata = {
    _id: manifest.name,
    name: manifest.name,
    description: manifest.description,
    'dist-tags': {
      [conf.options.tag as string ?? 'latest']: manifest.version,
    },
    versions: {
      [manifest.version]: {
        ...manifest,
        _id: `${manifest.name}@${manifest.version}`,
        _nodeVersion: process.version,
        dist: {
          tarball: `${registryUrl.origin}/${manifest.name}/-/${filename}`,
        },
      },
    },
    _attachments: {
      [filename]: {
        content_type: 'application/octet-stream',
        data: tarballData.toString('base64'),
        length: tarballData.length,
      },
    },
  }
  
  // Publish to registry
  const rc = new RegistryClient(conf.options)
  
  try {
    const response = await rc.request(packageUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(publishMetadata),
    })
    
    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw error('Failed to publish package', {
        code: 'EREQUEST',
        status: response.statusCode,
        response,
      })
    }
    
    return {
      id: `${manifest.name}@${manifest.version}`,
      name: manifest.name,
      version: manifest.version,
      tag: conf.options.tag as string ?? 'latest',
      registry: registryUrl.origin,
      shasum: manifest.dist?.shasum,
      integrity: manifest.dist?.integrity,
      size: tarballData.length,
    }
  } catch (err) {
    throw error('Failed to publish package', {
      code: 'EREQUEST',
      cause: err,
    })
  }
}