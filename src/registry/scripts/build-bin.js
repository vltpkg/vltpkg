#!/usr/bin/env node

import { mkdirSync, readdirSync, copyFileSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'
import { platform } from 'os'

/**
 * Recursively copy a directory and all its contents
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 */
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * Get the correct executable name for the current platform
 * @param {string} command - Base command name
 * @returns {string} - Platform-specific executable name
 */
function getExecutable(command) {
  return platform() === 'win32' ? `${command}.cmd` : command
}

/**
 * Run a command and return a promise
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @returns {Promise<void>}
 */
async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const executable = getExecutable(command)
    const child = spawn(executable, args, {
      stdio: 'inherit',
    })

    child.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', reject)
  })
}

async function main() {
  try {
    console.log('Building bin...')

    // Create dist/bin directory
    console.log('Creating dist/bin directory...')
    mkdirSync('./dist/bin', { recursive: true })

    // Copy demo directory
    console.log('Copying src/bin/demo to dist/bin/demo...')
    copyDir('./src/bin/demo', './dist/bin/demo')

    // Build the VSR binary with esbuild
    console.log('Building VSR binary with esbuild...')
    await runCommand('npx', [
      'esbuild',
      './src/bin/vsr.ts',
      '--outfile=./dist/bin/vsr.js',
      '--packages=external',
      '--platform=node',
      '--format=esm',
      '--log-level=silent',
    ])

    console.log('Bin build completed successfully')
  } catch (error) {
    console.error('Bin build failed:', error.message)
    process.exit(1)
  }
}

main()
