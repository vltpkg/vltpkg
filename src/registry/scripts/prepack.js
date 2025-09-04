#!/usr/bin/env node

import { writeFile, readFile, cp, mkdir, rm } from 'fs/promises'
import { resolve, join } from 'node:path'

const OUTDIR = resolve(process.cwd(), './.build-publish')

async function main() {
  console.log('Prepacking...')

  await rm(OUTDIR, { recursive: true, force: true })
  await mkdir(OUTDIR, { recursive: true })

  const pkg = JSON.parse(await readFile('./package.json', 'utf8'))
  delete pkg.publishConfig
  delete pkg.scripts
  delete pkg.devDependencies
  await writeFile(
    join(OUTDIR, 'package.json'),
    JSON.stringify(pkg, null, 2),
  )

  await cp('./README.md', join(OUTDIR, 'README.md'))

  // Keep all paths relative to dist/ so they work when published
  // and during development
  // TODO: dont rely on absolute hardcoded paths
  await cp('./dist', join(OUTDIR, 'dist'), { recursive: true })
}

main()
  .then(() => {
    console.log('Prepacked successfully')
  })
  .catch(error => {
    console.error('Prepacking failed:', error)
    process.exit(1)
  })
