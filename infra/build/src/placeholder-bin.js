#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

const { readFileSync } = require('fs')
const { resolve } = require('path')
const os = require('os')

const validPlatforms = Object.keys(
  JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))
    .optionalDependencies,
).map(name => name.replace('@vltpkg/cli-', ''))

const currentPlatform = `${os.platform()}-${os.arch()}`

console.error(
  validPlatforms.includes(currentPlatform) ?
    `This is a supported platform but the matching binary was not found.
This could be due to --no-optional or --ignore-scripts being used when installing.
Try again without either of those flags.
Otherwise check for error logs from the postinstall script.`
  : `The current platform is not supported by this package.`,
)
console.error(`Valid platforms: ${JSON.stringify(validPlatforms)}`)
console.error(`Current platform: ${JSON.stringify(currentPlatform)}`)

process.exit(1)
