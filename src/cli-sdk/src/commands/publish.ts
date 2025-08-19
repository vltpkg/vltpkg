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
import { dirname, resolve } from 'node:path'
import prettyBytes from 'pretty-bytes'
import { actual } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import type { LoadedConfig } from '../config/index.ts'

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
      'publish-directory': {
        description: `Directory to use for pack and publish operations instead of the current directory.
                    Similar to pnpm's publishConfig.directory feature.
                    The directory must exist and nothing will be copied to it.`,
        value: '<path>',
      },
    },
  })

export type CommandResultSingle = {
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

export type CommandResult =
  | CommandResultSingle
  | CommandResultSingle[]

export const views = {
  human: results => {
    const item = (r: CommandResultSingle) => {
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
    }
    return Array.isArray(results) ?
        results.map(item).join('\n\n')
      : item(results)
  },
  json: r => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const { options, projectRoot } = conf
  const queryString = conf.get('scope')
  const paths = conf.get('workspace')
  const groups = conf.get('workspace-group')
  const recursive = conf.get('recursive')

  const locations: string[] = []
  let single: string | null = null

  if (queryString) {
    const graph = actual.load({
      ...options,
      mainManifest: options.packageJson.read(projectRoot),
      monorepo: options.monorepo,
      loadManifests: false,
    })
    const query = new Query({
      graph,
      specOptions: conf.options,
      securityArchive: undefined,
    })
    const { nodes } = await query.search(queryString, {
      signal: new AbortController().signal,
    })
    for (const node of nodes) {
      const { location } = node.toJSON()
      assert(
        location,
        error(`node ${node.id} has no location`, {
          found: node,
        }),
      )
      locations.push(resolve(projectRoot, location))
    }
  } else if (paths?.length || groups?.length || recursive) {
    for (const workspace of options.monorepo ?? []) {
      locations.push(workspace.fullpath)
    }
  } else {
    single = options.packageJson.find(process.cwd()) ?? projectRoot
  }

  return single ?
      commandSingle(single, conf)
    : Promise.all(
        locations.map(location => commandSingle(location, conf)),
      )
}

const commandSingle = async (
  location: string,
  conf: LoadedConfig,
) => {
  const manifestPath = conf.options.packageJson.find(location)
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
    tarballName,
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
          tarball: new URL(`${name}/-/${tarballName}`, registryUrl)
            .href,
        },
      },
    },
    access,
    _attachments: {
      [tarballName]: {
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
        url: publishUrl,
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
