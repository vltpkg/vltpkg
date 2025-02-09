#!/usr/bin/env node
process.argv.splice(2, 0, 'install-exec')
import run from '../index.js'
await run()
