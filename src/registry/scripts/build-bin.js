#!/usr/bin/env node

import { mkdir, cp } from 'fs/promises'
import { resolve, join } from 'path'
import { spawn } from 'child_process'

/**
 * Run a command and return a promise
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @returns {Promise<void>}
 */
async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
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
  console.log('Building bin...')

  // Copy demo directory
  console.log('Copying src/bin/demo to dist/bin/demo...')
  await mkdir('./dist/bin/demo', { recursive: true })
  await cp('./src/bin/demo', './dist/bin/demo', { recursive: true })

  // Build the VSR binary with esbuild
  console.log('Building VSR binary with esbuild...')
  await runCommand(
    resolve(process.cwd(), 'node_modules/.bin/esbuild'),
    [
      join('./src/bin/vsr.ts'),
      '--bundle',
      `--outfile=${join('./dist/bin/vsr.js')}`,
      '--packages=external',
      '--platform=node',
      '--format=esm',
    ],
  )
}

main()
  .then(() => {
    console.log('Bin build completed successfully')
  })
  .catch(error => {
    console.error('Bin build failed:')
    console.error(error)
    process.exit(1)
  })
