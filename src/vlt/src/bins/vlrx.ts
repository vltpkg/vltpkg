#!/usr/bin/env node
process.argv.splice(2, 0, 'run-exec')
import run from '../index.js'
await run()
