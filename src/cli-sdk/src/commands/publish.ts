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
import npmFetch from 'npm-registry-fetch'
import npa from 'npm-package-arg'
import { getToken } from '../../../registry-client/src/auth.ts'

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
  human: (r: CommandResult) => {
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

  // Pack tarball using our internal function
  const { manifest, filename, tarballData } = await packTarball(
    folder,
    {
      projectRoot: conf.projectRoot,
    },
  )

  assert(
    manifest.name && manifest.version,
    error('Package must have a name and version'),
  )
  assert(tarballData, error('Failed to create tarball'))

  // Generate integrity hash
  const integrity = ssri.fromData(tarballData, {
    algorithms: [...new Set(['sha1', 'sha512'])],
  })

  const name = manifest.name
  const version = manifest.version
  const tag = 'latest'

  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const integrity512 = integrity.sha512?.[0]?.toString()
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const shasum = integrity.sha1?.[0]?.hexDigest() as string

  const publishManifest = {
    _id: name,
    name,
    'dist-tags': {
      [tag]: version,
    },
    access: 'public',
    versions: {
      [version]: {
        ...manifest,
        _id: `${name}@${version}`,
        dist: {
          integrity: integrity512,
          shasum,
          tarball: `${conf.options.registry}/${name}/-/${filename}`,
        },
      },
    },
    _attachments: {
      '0': {
        content_type: 'application/octet-stream',
        data: tarballData.toString('base64'),
        length: tarballData.length,
      },
    },
  }

  // Publish via PUT using our registry client
  const rc = new RegistryClient(conf.options)
  const registry = conf.options.registry
  const registryUrl = new URL(registry)

  const token = await getToken(
    registryUrl.origin,
    conf.options.identity,
  )

  console.log(token)
  console.log(npa(name).escapedName)

  await npmFetch(npa(name).escapedName, {
    access: 'public',
    '//registry.npmjs.org/:_authToken': token,
    method: 'PUT',
    body: publishManifest,
    ignoreBody: true,
  })

  // let response: CacheEntry
  // try {
  //   response = await rc.request(new URL(name, registryUrl), {
  //     method: 'PUT',
  //     headers: {
  //       'content-type': 'application/json',
  //     },
  //     body: JSON.stringify(publishManifest),
  //   })
  // } catch (err) {
  //   throw error('Failed to publish package', {
  //     cause: asError(err),
  //   })
  // }

  // if (response.statusCode !== 200 && response.statusCode !== 201) {
  //   throw error('Failed to publish package', {
  //     response,
  //   })
  // }

  return {
    id: `${name}@${version}`,
    name: name,
    version: version,
    tag,
    registry: registryUrl.origin,
    integrity: integrity512,
    shasum,
    size: tarballData.length,
  }
}
