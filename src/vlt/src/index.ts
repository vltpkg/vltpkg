import { error } from '@vltpkg/error-cause'
import { loadPackageJson } from 'package-json-from-dist'
import { Config } from './config/index.js'
import { type CliCommand, type Commands } from './types.js'
import { stdout, outputCommand, outputError } from './output.js'

const { version } = loadPackageJson(import.meta.filename) as {
  version: string
}

const loadCommand = async (
  command: Commands[keyof Commands] | undefined,
): Promise<CliCommand> => {
  try {
    // Be careful the line between the LOAD COMMANDS comment.
    // infra-build relies on this to work around esbuild bundling dynamic imports
    /* LOAD COMMANDS START */
    return (await import(`./commands/${command}.js`)) as CliCommand
    /* LOAD COMMANDS STOP */
    /* c8 ignore start - should not be possible, just a failsafe */
  } catch (e) {
    throw error('Command not implemented', {
      found: command,
      cause: e,
    })
  }
  /* c8 ignore stop */
}

const run = async () => {
  const vlt = await Config.load(process.cwd(), process.argv)

  if (vlt.get('version')) {
    return stdout(version)
  }

  const cwd = process.cwd()
  const { monorepo } = vlt.options

  // Infer the workspace by being in that directory.
  if (vlt.get('workspace') === undefined) {
    const ws = monorepo?.get(cwd)
    if (ws) {
      vlt.values.workspace = [ws.path]
      vlt.options.workspace = [ws.path]
    }
  }

  const { command, usage, view } = await loadCommand(vlt.command)

  if (vlt.get('help')) {
    return stdout(usage().usage())
  }

  try {
    outputCommand(await command(vlt), vlt, { view })
  } catch (e) {
    outputError(e, vlt, { usage: usage().usage() })
  }
}

export default run
