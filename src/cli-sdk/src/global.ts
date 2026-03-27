/**
 * Global install/uninstall utilities.
 *
 * When `--global` is set, the project root is redirected to an
 * XDG data directory so the existing install/uninstall machinery
 * can operate without changes. After the operation, package
 * binaries are linked to (or removed from) a global bin
 * directory.
 * @module
 */

import { XDG } from '@vltpkg/xdg'
import { cmdShim } from '@vltpkg/cmd-shim'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  writeFileSync,
} from 'node:fs'
import { readFile, rm, stat } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import type { LoadedConfig } from './config/index.ts'
import type { Graph } from '@vltpkg/graph'

const xdg = new XDG('vlt')

/** Directory that acts as the global "project". */
export const globalProjectDir = (): string => xdg.data('global')

/** Directory where global bin shims are placed. */
export const globalBinDir = (): string => xdg.data('bin')

/**
 * Ensure the global project directory exists with a minimal
 * `package.json` so the install machinery works.
 */
export const ensureGlobalProject = (): string => {
  const dir = globalProjectDir()
  mkdirSync(dir, { recursive: true })
  const pkg = resolve(dir, 'package.json')
  if (!existsSync(pkg)) {
    writeFileSync(
      pkg,
      JSON.stringify(
        {
          name: 'vlt-global',
          private: true,
          description: 'Global packages installed via vlt install -g',
        },
        null,
        2,
      ) + '\n',
    )
  }
  return dir
}

/**
 * Apply the global override to a loaded config.
 * Returns the global project root path.
 */
export const applyGlobalConfig = (conf: LoadedConfig): string => {
  const dir = ensureGlobalProject()
  conf.resetOptions(dir)
  return dir
}

/**
 * Read the bin map from an installed package's `package.json`
 * located under the global project's `node_modules`.
 */
const readBins = async (
  nodeModulesDir: string,
  pkgName: string,
): Promise<Record<string, string> | undefined> => {
  const pkgJsonPath = resolve(nodeModulesDir, pkgName, 'package.json')
  try {
    const raw = await readFile(pkgJsonPath, 'utf8')
    const manifest = JSON.parse(raw) as {
      bin?: string | Record<string, string>
      name?: string
      directories?: { bin?: string }
    }
    if (!manifest.bin && !manifest.directories?.bin) {
      return undefined
    }
    if (typeof manifest.bin === 'string') {
      const name =
        manifest.name?.split('/').pop() ?? pkgName.split('/').pop()
      return name ? { [name]: manifest.bin } : undefined
    }
    if (manifest.bin && typeof manifest.bin === 'object') {
      return manifest.bin
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Link binaries from installed packages to the global bin dir.
 * Called after a global install.
 */
export const linkGlobalBins = async (
  graph: Graph,
  projectRoot: string,
): Promise<string[]> => {
  const binDir = globalBinDir()
  mkdirSync(binDir, { recursive: true })
  const nodeModulesDir = resolve(projectRoot, 'node_modules')
  const linked: string[] = []
  const remover = new RollbackRemove()

  // Walk importers' direct dependencies for bins
  for (const importer of graph.importers) {
    for (const [, edge] of importer.edgesOut) {
      if (!edge.to) continue
      const pkgName = edge.spec.name
      const bins =
        edge.to.bins ?? (await readBins(nodeModulesDir, pkgName))
      if (!bins) continue
      for (const [binName, binPath] of Object.entries(bins)) {
        const absTarget = resolve(nodeModulesDir, pkgName, binPath)
        const shimPath = resolve(binDir, binName)
        await cmdShim(absTarget, shimPath, remover)
        linked.push(binName)
      }
    }
  }

  return linked
}

/**
 * Remove bin shims for packages that were uninstalled.
 * We compare what's in node_modules after uninstall with what
 * shims exist in the bin dir — any shim whose target no longer
 * resolves gets removed.
 */
export const unlinkRemovedBins = async (
  projectRoot: string,
): Promise<string[]> => {
  const binDir = globalBinDir()
  if (!existsSync(binDir)) return []
  const nodeModulesDir = resolve(projectRoot, 'node_modules')
  const removed: string[] = []

  let entries: string[]
  try {
    entries = readdirSync(binDir)
  } catch {
    return []
  }

  for (const entry of entries) {
    // Skip .cmd / .ps1 / .pwsh companion files
    if (
      entry.endsWith('.cmd') ||
      entry.endsWith('.ps1') ||
      entry.endsWith('.pwsh')
    ) {
      continue
    }
    const shimPath = resolve(binDir, entry)
    // Read the shim to see where it points
    let target: string | undefined
    try {
      // For symlinks (posix), readlink works
      target = readlinkSync(shimPath)
    } catch {
      // For cmd-shim files, parse the target from the script
      try {
        const content = await readFile(shimPath, 'utf8')
        // sh shim format: "$basedir/<relative-path>"
        const match = content.match(/\$basedir\/([^\s"]+)/)
        if (match?.[1]) {
          target = resolve(binDir, match[1])
        }
      } catch {
        // can't read, skip
      }
    }

    if (!target) continue

    // Resolve absolute path
    const absTarget =
      target.startsWith('/') || target.startsWith('\\') ?
        target
      : resolve(binDir, target)

    // Check if the target is inside our global node_modules
    const rel = relative(nodeModulesDir, absTarget)
    if (rel.startsWith('..')) continue // not our shim

    // Check if the target still exists
    try {
      await stat(absTarget)
    } catch {
      // Target gone — remove the shim and its companions
      await rm(shimPath, { force: true })
      await rm(shimPath + '.cmd', { force: true })
      await rm(shimPath + '.ps1', { force: true })
      await rm(shimPath + '.pwsh', { force: true })
      removed.push(entry)
    }
  }

  return removed
}

/**
 * Check if the global bin directory is on PATH and print a hint
 * to stderr if not.
 */
export const checkPathHint = (
  stderr: (...args: unknown[]) => void,
): void => {
  const binDir = globalBinDir()
  const pathEnv = process.env.PATH ?? ''
  const dirs = pathEnv.split(process.platform === 'win32' ? ';' : ':')
  const onPath = dirs.some(d => resolve(d) === resolve(binDir))
  if (!onPath) {
    stderr(
      `\nTo use globally installed commands, add the global bin directory to your PATH:\n` +
        `  export PATH="${binDir}:$PATH"\n`,
    )
  }
}
