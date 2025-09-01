#!/usr/bin/env node

import { mkdirSync, readdirSync, copyFileSync } from 'fs'
import { join } from 'path'

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

async function main() {
  try {
    console.log('Building assets...')

    // Copy source assets to dist/assets
    console.log('Copying src/assets to dist/assets...')
    copyDir('./src/assets', './dist/assets')

    // Copy GUI assets to dist/assets/public
    console.log('Copying @vltpkg/gui dist to dist/assets/public...')
    copyDir('./node_modules/@vltpkg/gui/dist', './dist/assets/public')

    console.log('Assets build completed successfully')
  } catch (error) {
    console.error('Assets build failed:', error.message)
    process.exit(1)
  }
}

main()
