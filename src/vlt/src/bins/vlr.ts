#!/usr/bin/env node
process.argv.splice(2, 0, 'run')
await import('../index.js').then(r => r.default())
