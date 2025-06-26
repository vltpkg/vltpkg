import { PackageJson } from '@vltpkg/package-json'
import type { Manifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import { create as tarCreate } from 'tar'

export type PackTarballOptions = {
  'pack-destination'?: string
  dry?: boolean
  projectRoot?: string
}

export type PackTarballResult = {
  manifest: Manifest
  filename: string
  tarballData?: Buffer
}

/**
 * Create a tarball from a package directory
 * 
 * @param path - The directory containing the package to pack
 * @param options - Options for packing
 * @returns The manifest, filename, and tarball data (unless dry run)
 */
export const packTarball = async (
  path: string,
  options: PackTarballOptions = {},
): Promise<PackTarballResult> => {
  const projectRoot = options.projectRoot ?? process.cwd()
  // If path is absolute, use it directly. Otherwise resolve relative to projectRoot
  const packTarget = resolve(path) === path ? path : resolve(projectRoot, path)
  
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