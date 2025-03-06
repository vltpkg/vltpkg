#!/usr/bin/env node
process.argv.splice(2, 0, 'install-exec')
import vlt from '@vltpkg/cli-sdk'
await vlt()
