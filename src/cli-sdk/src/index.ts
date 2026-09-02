import { format } from 'node:util'
import { asRootError } from '@vltpkg/output/error'
import {
  getSortedCliOptions,
  getSortedKeys,
} from './config/definition.ts'
import { Config } from './config/index.ts'
import { outputCommand, stderr, stdout } from './output.ts'
import { indent } from './print-err.ts'
import { dispatchRegistry } from './commands/registry.ts'
import { version } from './version.ts'
import { loadCommand } from './load-command.ts'

export type {
  Command,
  CommandFn,
  CommandUsage,
} from './load-command.ts'

const loadVlt = async (cwd: string, argv: string[]) => {
  try {
    return await Config.load(cwd, argv)
  } catch (e) {
    const err = asRootError(e, { code: 'JACKSPEAK' })
    const { found, path, wanted, name } = err.cause
    const isConfigFile = typeof path === 'string'
    const msg =
      isConfigFile ?
        `Problem in Config File ${path}`
      : 'Invalid Option Flag'
    const validOptions =
      wanted ? undefined
      : isConfigFile ? getSortedKeys()
      : getSortedCliOptions()
    stderr(msg)
    stderr(err.message)
    if (name) stderr(indent(`Field: ${format(name)}`))
    if (found) {
      stderr(
        indent(
          `Found: ${isConfigFile ? JSON.stringify(found) : format(found)}`,
        ),
      )
    }
    if (wanted) stderr(indent(`Wanted: ${format(wanted)}`))
    if (validOptions) {
      stderr(indent('Valid Options:'))
      stderr(indent(validOptions.join('\n'), 4))
    }
    stderr(
      indent(
        `Run 'vlt help' for more information about available options.`,
      ),
    )
    return process.exit(process.exitCode || 1)
  }
}

const run = async (argv: string[] = process.argv.slice(2)) => {
  const start = Date.now()
  const cwd = process.cwd()
  const vlt = await loadVlt(cwd, argv)

  if (vlt.get('version')) {
    return stdout(version)
  }

  // compiled: Config.options → maybeLoad. Infer + `-w` still SIGBUS
  // (Map size/get, minimatch.filter). Skip infer.
  try {
    const { monorepo } = vlt.options

    if (
      /* c8 ignore next */
      !('perry' in process.versions) &&
      vlt.get('workspace') === undefined &&
      monorepo
    ) {
      const ws = monorepo.getWorkspace(cwd)
      if (ws) {
        vlt.values.workspace = [ws.path]
        vlt.options.workspace = [ws.path]
      }
    }

    if (
      vlt.command !== 'init' &&
      (vlt.get('workspace') || vlt.get('workspace-group')) &&
      !monorepo?.hasWorkspaces()
    ) {
      stderr(
        `Error: No matching workspaces found. Make sure the vlt.json config contains the correct workspaces.`,
      )
      if (vlt.get('workspace')) {
        stderr(indent(`Workspace: ${format(vlt.get('workspace'))}`))
      }
      if (vlt.get('workspace-group')) {
        stderr(
          indent(
            `Workspace Group: ${format(vlt.get('workspace-group'))}`,
          ),
        )
      }
      return process.exit(process.exitCode || 1)
    }
  } catch (err) {
    /* c8 ignore next */
    if (!('perry' in process.versions)) throw err
  }

  if (vlt.command === 'registry') {
    await dispatchRegistry(vlt)
  }

  const command = await loadCommand(vlt.command)
  await outputCommand(command, vlt, { start, vltVersion: version })
}

export default run
