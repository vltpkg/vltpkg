// Dark-test entry for the ×4 detached workers.
// Mirrors the compiled binary's daemon gate in src/cli-sdk/src/perry.ts:
// VLT_INTERNAL_CMD names the worker, the payload arrives on stdin
// EOT-terminated, and runDaemon never returns.
import { runDaemon } from '../../../../src/cli-sdk/src/daemons.ts'

const cmd = process.env.VLT_INTERNAL_CMD
if (!cmd) {
  process.stderr.write('set VLT_INTERNAL_CMD\n')
  process.exit(2)
}
await runDaemon(cmd)
