#!/usr/bin/env node

import { mkdir, cp } from 'fs/promises'

async function main() {
  console.log('Building assets...')

  // Copy source assets to dist/assets
  console.log('Copying src/assets to dist/assets...')
  await mkdir('./dist/assets', { recursive: true })
  await cp('./src/assets', './dist/assets', { recursive: true })

  // Copy GUI assets to dist/assets/public
  console.log('Copying @vltpkg/gui dist to dist/assets/public...')
  await mkdir('./dist/assets/public', { recursive: true })
  await cp(
    './node_modules/@vltpkg/gui/dist',
    './dist/assets/public',
    { recursive: true },
  )
}

main()
  .then(() => {
    console.log('Assets build completed successfully')
  })
  .catch(error => {
    console.error('Assets build failed:')
    console.error(error)
    process.exit(1)
  })
