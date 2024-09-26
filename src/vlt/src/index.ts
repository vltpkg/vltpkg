import { Monorepo } from '@vltpkg/workspaces'
import { Config } from './config/index.js'
import { PathScurry } from 'path-scurry'
import { PackageJson } from '@vltpkg/package-json'
import { CliCommand, Commands } from './types.js'
import { error } from '@vltpkg/error-cause'

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
  const packageJson = new PackageJson()
  const scurry = new PathScurry(vlt.projectRoot)
  const monorepo = Monorepo.maybeLoad(vlt.projectRoot, {
    packageJson,
    scurry,
  })

  // Infer the workspace by being in that directory.
  if (vlt.get('workspace') === undefined) {
    const ws = monorepo?.get(cwd)
    if (ws) vlt.values.workspace = [ws.path]
  }

  const { command, usage } = await loadCommand(vlt.command)

  if (vlt.get('help')) {
    console.log(typeof usage === 'function' ? await usage() : usage)
  } else {
    // TODO: if it throws, pass to central error handler
    await command(vlt, {
      monorepo,
      packageJson,
      scurry,
    })
  }
}

export default run
