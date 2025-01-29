import { error } from '@vltpkg/error-cause'
import { loadPackageJson } from 'package-json-from-dist'
import { Config } from './config/index.js'
import { type Command, type Commands } from './types.js'
import { stdout, outputCommand } from './output.js'

const { version } = loadPackageJson(import.meta.filename) as {
  version: string
}

const loadCommand = async <T>(
  command: Commands[keyof Commands] | undefined,
): Promise<Command<T>> => {
  try {
    // Be careful the line between the LOAD COMMANDS comment.
    // infra-build relies on this to work around esbuild bundling dynamic imports
    /* LOAD COMMANDS START */
    return (await import(`./commands/${command}.js`)) as Command<T>
    /* LOAD COMMANDS STOP */
    /* c8 ignore start - should not be possible, just a failsafe */
  } catch (e) {
    throw error('Could not load command', {
      found: command,
      cause: e,
    })
  }
  /* c8 ignore stop */
}

const run = async () => {
  const start = Date.now()
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

  const command = await loadCommand(vlt.command)
  await outputCommand(command, vlt, { start })
}

export default run
