#!/usr/bin/env node

/**
 * Binary wrapper for the vlt CLI.
 *
 * Tries to find and exec the platform-specific standalone binary from
 * an optional dependency. Falls back to the bundled JS entrypoint when
 * no native binary is available (e.g. unsupported platform, or the
 * optional dep was not installed).
 */

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { basename } from 'node:path'

const PLATFORMS = /** @type {const} */ ({
  'darwin-arm64': '@vltpkg/vlt-darwin-arm64',
  'darwin-x64': '@vltpkg/vlt-darwin-x64',
  'linux-arm64': '@vltpkg/vlt-linux-arm64',
  'linux-x64': '@vltpkg/vlt-linux-x64',
  'win32-arm64': '@vltpkg/vlt-win32-arm64',
  'win32-x64': '@vltpkg/vlt-win32-x64',
})

const platformKey = `${process.platform}-${process.arch}`
const pkg =
  PLATFORMS[/** @type {keyof typeof PLATFORMS} */ (platformKey)]

if (pkg) {
  try {
    const require = createRequire(import.meta.url)
    const binPath = require.resolve(
      `${pkg}/bin/vlt${process.platform === 'win32' ? '.exe' : ''}`,
    )
    const binName = basename(process.argv[1] ?? 'vlt')
    const result = execFileSync(binPath, process.argv.slice(2), {
      stdio: 'inherit',
      env: { ...process.env, VLT_BIN_NAME: binName },
    })
    process.exit(0)
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'status' in e &&
      typeof e.status === 'number'
    ) {
      process.exit(e.status)
    }
    // If the binary was not found (require.resolve failed),
    // fall through to JS bundle below.
    if (
      !(
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === 'MODULE_NOT_FOUND'
      )
    ) {
      throw e
    }
  }
}

// Fallback: run the bundled JS entrypoint
const binName = basename(process.argv[1] ?? 'vlt').replace(
  /\.js$/,
  '',
)

const commands = /** @type {const} */ ({
  vlx: 'exec',
  vlr: 'run',
  vlxl: 'exec-local',
  vlrx: 'run-exec',
})

const command =
  commands[/** @type {keyof typeof commands} */ (binName)]
if (command) {
  process.argv.splice(2, 0, command)
}

await import('../vlt.js')
