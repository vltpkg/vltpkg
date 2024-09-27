import { error } from '@vltpkg/error-cause'
import { Config } from './config/index.js'
import { CliCommand, Commands } from './types.js'

const loadCommand = async (
  command: Commands[keyof Commands] | undefined,
): Promise<CliCommand> => {
  try {
    /* LOAD COMMANDS START */
    return await import(`./commands/${command}.js`)
    /* LOAD COMMANDS STOP */
    /* c8 ignore start - should not be possible, just a failsafe */
  } catch (e) {
    throw error('Command not implemented', {
      found: command,
      cause: e as Error,
    })
  }
  /* c8 ignore stop */
}

const run = async () => {
  const vlt = await Config.load(process.cwd(), process.argv)
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

  const { command, usage } = await loadCommand(vlt.command)

  if (vlt.get('help')) {
    console.log(typeof usage === 'function' ? await usage() : usage)
  } else {
    // TODO: if it throws, pass to central error handler
    await command(vlt, vlt.options)
  }
}

export default run
