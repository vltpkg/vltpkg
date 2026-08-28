/**
 * Hidden-subcommand dispatch for the detached workers.
 *
 * The Node builds reach each worker through a code-split script: the parent
 * runs `process.execPath <script>`. Compiled there is no script —
 * `import.meta.filename` is a build-machine path — so the parent re-executes
 * the binary itself with VLT_INTERNAL_CMD, and lands here.
 *
 * Imports are static: `import()` below module top level is silently dropped
 * by the compiler, so every worker's closure links whether or not it runs.
 */
import cacheUnzip from '@vltpkg/cache-unzip/unzip'
import { main as cacheRevalidate } from '@vltpkg/registry-client/revalidate'
import { main as rollbackRemove } from '@vltpkg/rollback-remove/remove'
import { main as securityArchiveUpdate } from '@vltpkg/security-archive/update-expired'

/** VLT_INTERNAL_CMD value -> worker. The arg is the worker's store path. */
export const daemons: Record<
  string,
  (arg?: string) => Promise<unknown>
> = {
  'cache-unzip': arg => cacheUnzip(arg),
  'cache-revalidate': arg => cacheRevalidate(arg),
  'rollback-remove': () => rollbackRemove(),
  'security-archive-update': () => securityArchiveUpdate(),
}

/**
 * Run the worker `cmd` names and exit. Never returns: a worker either
 * finishes its work or reports that it had none, which the Node builds
 * signal with exit code 1.
 */
export const runDaemon = async (cmd: string): Promise<never> => {
  const daemon = daemons[cmd]
  if (!daemon) {
    process.stderr.write(`unknown VLT_INTERNAL_CMD: ${cmd}\n`)
    return process.exit(1)
  }
  process.title = `vlt-${cmd}`
  // the workers that take one read their store path off the end of argv
  const arg =
    process.argv.length === 2 ? undefined : process.argv.at(-1)
  return process.exit((await daemon(arg)) === false ? 1 : 0)
}
