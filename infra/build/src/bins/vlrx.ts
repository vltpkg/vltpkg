#!/usr/bin/env node
process.argv.splice(2, 0, 'run-exec')
import vlt from '@vltpkg/cli-sdk'
await vlt()
