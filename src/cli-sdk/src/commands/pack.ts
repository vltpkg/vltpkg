import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import assert from 'node:assert'
import { run } from '@vltpkg/run'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { packTarball } from '../pack-tarball.ts'
import type { Views } from '../view.ts'
import prettyBytes from 'pretty-bytes'

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

type CommandResult = {
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

export const views = {
  human: r => {
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
  },
  json: r => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const manifestPath = conf.options.packageJson.find()
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
