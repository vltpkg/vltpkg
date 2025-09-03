#!/usr/bin/env node

import { writeFile, readFile, cp } from 'fs/promises'

async function main() {
  console.log('Prepacking...')

  const pkg = JSON.parse(await readFile('./package.json', 'utf8'))

  delete pkg.publishConfig
  delete pkg.scripts
  delete pkg.devDependencies
  pkg.bin = './bin/vsr.js'

  await writeFile('./dist/package.json', JSON.stringify(pkg, null, 2))

  await cp('./README.md', './dist/README.md')
}

main()
  .then(() => {
    console.log('Prepacked successfully')
  })
  .catch(error => {
    console.error('Prepacking failed:', error)
    process.exit(1)
  })
