#!/usr/bin/env node

import { spawn } from 'child_process'

// Check if we're in Windows CI environment
const isWindowsCI =
  process.env.CI && process.env.RUNNER_OS === 'Windows'

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
  try {
    // Install dependencies
    if (isWindowsCI) {
      console.log(
        'Windows CI detected: Installing with --ignore-scripts and --no-optional',
      )
      await runCommand('pnpm', [
        'install',
        '--ignore-scripts',
        '--no-optional',
      ])
    } else {
      console.log('Installing dependencies...')
      await runCommand('pnpm', ['install'])
    }

    // Build the project
    console.log('Building project...')
    await runCommand('pnpm', ['build'])

    console.log('Pretest completed successfully')
  } catch (error) {
    console.error('Pretest failed:', error.message)
    process.exit(1)
  }
}

main()
