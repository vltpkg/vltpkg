process.argv.splice(2, 0, 'run')
import vlt from '@vltpkg/cli-sdk'
await vlt()
