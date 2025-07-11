import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import type { CacheEntry } from '@vltpkg/registry-client'
import { run } from '@vltpkg/run'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { packTarball } from '../pack-tarball.ts'
import type { Views } from '../view.ts'
import assert from 'node:assert'
import { asError } from '@vltpkg/types'
import { dirname } from 'node:path'
import prettyBytes from 'pretty-bytes'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'publish',
    usage: '',
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
        description: `Provide an OTP to use when publishing a package.`,
        value: '<otp>',
      },
    },
  })

export type CommandResult = {
  id: string
  name: string
  version: string
  tag: string
  registry: string
  shasum?: string
  integrity?: string
  size: number
  access: string
  unpackedSize: number
  files: string[]
}

export const views = {
  human: r => {
    const lines = [
      `📦 Package: ${r.id}`,
      `🏷️ Tag: ${r.tag}`,
      `📡 Registry: ${r.registry}`,
      `📁 ${r.files.length} Files`,
      ...r.files.map(f => `  - ${f}`),
      `📊 Package Size: ${prettyBytes(r.size)}`,
      `📂 Unpacked Size: ${prettyBytes(r.unpackedSize)}`,
    ]
    if (r.shasum) lines.push(`🔒 Shasum: ${r.shasum}`)
    if (r.integrity) lines.push(`🔐 Integrity: ${r.integrity}`)

    return lines.join('\n')
  },
  json: r => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const manifestPath = conf.options.packageJson.find()
  assert(manifestPath, 'No package.json found')
  const manifestDir = dirname(manifestPath)
  const manifest = conf.options.packageJson.read(manifestDir)

  assert(
    !manifest.private,
    error('Package has been marked as private'),
  )

  const {
    tag = 'latest',
    access,
    registry,
    'dry-run': dry = false,
    otp,
  } = conf.options
  const registryUrl = new URL(registry)

  const runOptions = {
    cwd: manifestDir,
    projectRoot: conf.projectRoot,
    packageJson: conf.options.packageJson,
    manifest,
    ignoreMissing: true,
    ignorePrePost: true,
  }

  await run({
    ...runOptions,
    arg0: 'prepublishOnly',
  })

  await run({
    ...runOptions,
    arg0: 'prepublish',
  })

  await run({
    ...runOptions,
    arg0: 'prepack',
  })

  await run({
    ...runOptions,
    arg0: 'prepare',
  })

  const {
    name,
    version,
    filename,
    tarballData,
    unpackedSize,
    files,
    integrity,
    shasum,
  } = await packTarball(manifest, manifestDir, conf)

  await run({
    ...runOptions,
    arg0: 'postpack',
  })

  await run({
    ...runOptions,
    arg0: 'publish',
  })

  const publishMetadata = {
    _id: name,
    name,
    description: manifest.description || '',
    'dist-tags': {
      [tag]: version,
    },
    versions: {
      [version]: {
        ...manifest,
        _id: `${name}@${version}`,
        _nodeVersion: process.versions.node,
        dist: {
          ...manifest.dist,
          integrity,
          shasum,
          tarball: new URL(`${name}/-/${filename}`, registryUrl).href,
        },
      },
    },
    access,
    _attachments: {
      [filename]: {
        content_type: 'application/octet-stream',
        data: tarballData.toString('base64'),
        length: tarballData.length,
      },
    },
  }

  const rc = new RegistryClient(conf.options)
  const publishUrl = new URL(
    name.startsWith('@') ? name.replace('/', '%2F') : name,
    registryUrl,
  )

  if (!dry) {
    let response: CacheEntry
    try {
      response = await rc.request(publishUrl, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          // These control what type of OTP auth flow is used
          'npm-auth-type': 'web',
          'npm-command': 'publish',
        },
        body: JSON.stringify(publishMetadata),
        otp,
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
  }

  await run({
    ...runOptions,
    arg0: 'postpublish',
  })

  return {
    id: `${name}@${version}`,
    name,
    version,
    tag,
    access,
    registry: registryUrl.origin,
    integrity,
    shasum,
    size: tarballData.length,
    unpackedSize,
    files,
  }
}
