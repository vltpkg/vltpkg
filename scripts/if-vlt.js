#!/usr/bin/env node

const isVlt = Object.keys(process.env).find(key =>
  key.startsWith('VLT_'),
)
process.exit(isVlt ? 0 : 1)
