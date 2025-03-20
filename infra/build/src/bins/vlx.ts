process.argv.splice(2, 0, 'exec')
import vlt from '@vltpkg/cli-sdk'
await vlt()
