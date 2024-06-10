#!/usr/bin/env node
process.argv.splice(2, 0, 'exec')
await import('./index.js')
