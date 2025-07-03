import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import assert from 'node:assert'
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
      `📦 ${r.name}@${r.version}`,
      `📄 ${r.filename}`,
      `📁 ${r.files.length} files`,
      ...r.files.map(f => `  - ${f}`),
      `📊 package size: ${prettyBytes(r.size)}`,
      `📂 unpacked size: ${prettyBytes(r.unpackedSize)}`,
    ]
    if (r.shasum) lines.push(`🔒 shasum: ${r.shasum}`)
    if (r.integrity) lines.push(`🔐 integrity: ${r.integrity}`)
    return lines.join('\n')
  },
  json: r => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const manifestPath = conf.options.packageJson.find()
  assert(manifestPath, 'No package.json found')
  const manifestDir = dirname(manifestPath)
  const manifest = conf.options.packageJson.read(manifestDir)

  const {
    name,
    version,
    filename,
    tarballData,
    unpackedSize,
    files,
    integrity,
    shasum,
  } = await packTarball(manifest, manifestDir)

  if (!conf.options['dry-run']) {
    await writeFile(join(manifestDir, filename), tarballData)
  }

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
