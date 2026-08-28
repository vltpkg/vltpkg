/**
 * The compiled binary's entry point (`perry.toml` `entry`). The equivalent of
 * infra/build/src/bins/*.ts, collapsed into one program because the binary is
 * a busybox: every bin name is the same executable, reached through its own
 * symlink, and told apart by `basename(argv[0])`.
 *
 * Perry-exclusive code is allowed here: cli-sdk is the CLI surface, not part
 * of the Node-compatible SDK.
 */
import { basename } from 'node:path'
import { runDaemon } from './daemons.ts'
import vlt from './index.ts'
import type { Commands } from './config/definition.ts'

const binCommands: Record<string, keyof Commands> = {
  vlr: 'run',
  vlrx: 'run-exec',
  vlx: 'exec',
  vlxl: 'exec-local',
}

const daemon = process.env.VLT_INTERNAL_CMD
if (daemon) {
  await runDaemon(daemon)
} else {
  // compiled, argv[0] is the path the user invoked, so the symlink name is
  // the bin name. Under Node the same file is argv[1].
  const bin = basename(
    ('perry' in process.versions ?
      process.argv[0]
    : process.argv[1]) ?? 'vlt',
  ).replace(/\.[cm]?[jt]s$|\.exe$/, '')
  const command = binCommands[bin]
  if (command) process.argv.splice(2, 0, command)
  await vlt()
}
