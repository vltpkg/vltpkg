#!/usr/bin/env node
process.argv.splice(2, 0, 'run')
import run from '../index.js'
await run()
