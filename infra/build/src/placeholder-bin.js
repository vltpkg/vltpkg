#!/usr/bin/env node

console.log(`The correct platform specific binary was not found.
This could be due to --no-optional or --ignore-scripts being used.
Try again without either of those flags.`)

process.exit(1)
