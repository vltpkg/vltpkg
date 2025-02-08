#!/usr/bin/env node
process.argv.splice(2, 0, 'run')
void import('../index.ts').then(r => r.default())
