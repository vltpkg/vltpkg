#!/usr/bin/env node
process.argv.splice(2, 0, 'install-exec')
await import('./index.js')
