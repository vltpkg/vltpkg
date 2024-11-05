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
      cause: e as Error,
    })
  }
  /* c8 ignore stop */
}

const run = async () => {
  const vlt = await Config.load(process.cwd(), process.argv)

  if (vlt.get('version')) {
    return stdout(version)
  }

  const { command, usage, ...Command } = await loadCommand(
    vlt.command,
  )

  if (vlt.get('help')) {
    return stdout(usage().usage())
  }

  try {
    outputCommand(await command(vlt), vlt, Command)
  } catch (e) {
    outputError(e, vlt, { usage: usage().usage() })
  }
}

export default run
