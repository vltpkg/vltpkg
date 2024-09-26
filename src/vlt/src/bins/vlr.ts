#!/usr/bin/env node
process.argv.splice(2, 0, 'run')
void import('../index.js').then(r => r.default())
