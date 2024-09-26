#!/usr/bin/env node
process.argv.splice(2, 0, 'run-exec')
void import('../index.js').then(r => r.default())
