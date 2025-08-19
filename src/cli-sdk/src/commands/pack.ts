import { writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import assert from 'node:assert'
import { run } from '@vltpkg/run'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { packTarball } from '../pack-tarball.ts'
import type { Views } from '../view.ts'
import prettyBytes from 'pretty-bytes'
import { actual } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import type { LoadedConfig } from '../config/index.ts'
import { error } from '@vltpkg/error-cause'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'pack',
    usage: '',
    description: `Create a tarball from a package in the current directory or specified folder.
    
    The tarball will be saved to the current directory with the name
    <name>-<version>.tgz.`,
    options: {
      'dry-run': {
        description:
          'Show what would be packed without creating a tarball',
      },
    },
  })

export type CommandResultSingle = {
  id: string
  name: string
  version: string
  filename: string
  files: string[]
  size: number
  unpackedSize: number
  shasum?: string
  integrity?: string
}

export type CommandResult =
  | CommandResultSingle
  | CommandResultSingle[]

export const views = {
  human: results => {
    const item = (r: CommandResultSingle) => {
      const lines = [
        `📦 Package: ${r.id}`,
        `📄 File: ${r.filename}`,
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
        results.map(item).join('\n')
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

export const commandSingle = async (
  location: string,
  conf: LoadedConfig,
) => {
  const manifestPath = conf.options.packageJson.find(location)
  assert(manifestPath, 'No package.json found')
  const manifestDir = dirname(manifestPath)
  const manifest = conf.options.packageJson.read(manifestDir)

  const isDryRun = conf.options['dry-run']
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

  if (!isDryRun) {
    await writeFile(join(manifestDir, filename), tarballData)
  }

  await run({
    ...runOptions,
    arg0: 'postpack',
  })

  return {
    id: `${name}@${version}`,
    name,
    version,
    filename,
    files,
    size: tarballData.length,
    unpackedSize,
    shasum,
    integrity,
  }
}
