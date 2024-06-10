#!/usr/bin/env node
process.argv.splice(2, 0, 'run-exec')
await import('./index.js')
