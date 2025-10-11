import { XDG } from '@vltpkg/xdg'
import { chmod, mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const xdg = new XDG('vlt')
let shimPath: string | undefined

/**
 * Get or create the node-gyp shim file path
 * The shim redirects node-gyp calls to vlx node-gyp@latest
 */
export async function getNodeGypShim(): Promise<string> {
  if (shimPath) return shimPath

  const runtimeDir = xdg.runtime('run')
  const shimFile = join(runtimeDir, 'node-gyp')

  // Check if shim already exists
  try {
    await stat(shimFile)
    shimPath = shimFile
    return shimPath
  } catch {
    // Shim doesn't exist, create it
  }

  // Create runtime directory if needed
  await mkdir(runtimeDir, { recursive: true })

  // Create shim that calls vlx
  /* c8 ignore start - ignore platform-dependent coverage */
  const shimContent =
    process.platform === 'win32' ?
      `@echo off\nvlx node-gyp@latest %*\n`
    : `#!/bin/sh\nexec vlx node-gyp@latest "$@"\n`
  /* c8 ignore stop */

  await writeFile(shimFile, shimContent, 'utf8')

  // Make executable on Unix systems
  if (process.platform !== 'win32') {
    await chmod(shimFile, 0o755)
  }

  shimPath = shimFile
  return shimPath
}

/**
 * Get the directory containing the node-gyp shim
 * This can be prepended to PATH to make the shim available
 */
export async function getNodeGypShimDir(): Promise<string> {
  const shim = await getNodeGypShim()
  return dirname(shim)
}

/**
 * Check if a command contains node-gyp references
 */
export function hasNodeGypReference(command: string): boolean {
  return command.includes('node-gyp')
}
