import { format } from 'node:util'
import { asRootError } from '@vltpkg/output/error'
import { loadPackageJson } from 'package-json-from-dist'
import {
  getSortedCliOptions,
  getSortedKeys,
} from './config/definition.ts'
import { Config } from './config/index.ts'
import { outputCommand, stderr, stdout } from './output.ts'
import { indent } from './print-err.ts'
import { loadCommand } from './load-command.ts'

export type {
  Command,
  CommandFn,
  CommandUsage,
} from './load-command.ts'

const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as {
  version: string
}

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

const run = async () => {
  const start = Date.now()
  const cwd = process.cwd()
  const vlt = await loadVlt(cwd, process.argv)

  if (vlt.get('version')) {
    return stdout(version)
  }

  const { monorepo } = vlt.options

  // Infer the workspace by being in that directory.
  if (vlt.get('workspace') === undefined) {
    const ws = monorepo?.get(cwd)
    if (ws) {
      vlt.values.workspace = [ws.path]
      vlt.options.workspace = [ws.path]
    }
  }

  if (
    (vlt.get('workspace') || vlt.get('workspace-group')) &&
    ![...(monorepo?.values() ?? [])].length
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

  const command = await loadCommand(vlt.command)
  await outputCommand(command, vlt, { start })
}

export default run
