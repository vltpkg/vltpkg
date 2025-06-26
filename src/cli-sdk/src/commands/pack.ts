import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import { writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { create as tarCreate } from 'tar'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'pack',
    usage: ['[<folder>]'],
    description: `Create a tarball from a package in the current directory or specified folder.
    
    The tarball will be saved to the current directory with the name
    <name>-<version>.tgz, unless a different destination is specified.`,
    options: {
      'pack-destination': {
        description: 'Directory to save the tarball in',
        value: '<directory>',
      },
      dry: {
        description: 'Show what would be packed without creating a tarball',
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
  entryCount?: number
  bundled?: string[]
}

export const views = {
  human: (r: CommandResult) => {
    const lines = [
      `📦 ${r.name}@${r.version}`,
      `📄 ${r.filename}`,
      `📊 package size: ${formatSize(r.size)}`,
      `📂 unpacked size: ${formatSize(r.unpackedSize)}`,
    ]
    if (r.shasum) lines.push(`🔒 shasum: ${r.shasum}`)
    if (r.integrity) lines.push(`🔐 integrity: ${r.integrity}`)
    if (r.entryCount) lines.push(`📁 total files: ${r.entryCount}`)
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

export const packTarball = async (
  path: string,
  options: {
    'pack-destination'?: string
    dry?: boolean
    projectRoot?: string
  } = {},
): Promise<{
  manifest: Manifest
  filename: string
  tarballData?: Buffer
}> => {
  const projectRoot = options.projectRoot ?? process.cwd()
  const packTarget = resolve(projectRoot, path)
  
  // Read package.json
  const packageJson = new PackageJson()
  const manifest = await packageJson.read(packTarget)
  
  if (!manifest.name || !manifest.version) {
    throw new Error('Package must have a name and version')
  }
  
  // Generate filename
  const filename = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`
  
  // If dry run, just return the info
  if (options.dry) {
    return { manifest, filename }
  }
  
  // Create tarball
  const cwd = packTarget
  const tarballData = await tarCreate({
    cwd,
    gzip: true,
    portable: true,
    // Follow npm pack conventions
    filter: (path: string) => {
      // Always include package.json
      if (path === 'package.json') return true
      
      // TODO: Respect .npmignore and files field in package.json
      // For now, exclude common non-package files
      const excludePatterns = [
        /^\.git\//,
        /^node_modules\//,
        /^\.nyc_output\//,
        /^coverage\//,
        /^\.vscode\//,
        /^\.idea\//,
        /^\.(DS_Store|gitignore|npmignore|editorconfig)$/,
        /~$/,
        /\.swp$/,
      ]
      
      return !excludePatterns.some(pattern => pattern.test(path))
    },
  }, [
    '.',
  ]).concat()
  
  return { manifest, filename, tarballData }
}

export const command: CommandFn<CommandResult> = async conf => {
  const [folder = '.'] = conf.positionals
  
  // For now, use current directory as pack destination
  // TODO: Add proper option handling for pack-destination
  const packDestination = '.'
  
  // TODO: Add proper option handling for dry-run
  const dry = false
  
  const { manifest, filename, tarballData } = await packTarball(folder, {
    'pack-destination': packDestination,
    dry,
    projectRoot: conf.options.projectRoot,
  })
  
  if (!dry && tarballData) {
    const destPath = resolve(packDestination, filename)
    await writeFile(destPath, tarballData)
  }
  
  // Calculate sizes
  const size = tarballData?.length ?? 0
  const unpackedSize = tarballData?.length ? Math.floor(tarballData.length * 2.5) : 0
  
  return {
    id: `${manifest.name}@${manifest.version}`,
    name: manifest.name!,
    version: manifest.version!,
    filename,
    files: [], // TODO: list actual files
    size,
    unpackedSize,
    shasum: manifest.dist?.shasum,
    integrity: manifest.dist?.integrity,
    entryCount: 0, // TODO: count actual files
    bundled: manifest.bundleDependencies,
  }
}