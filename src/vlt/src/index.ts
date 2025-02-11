import { error } from '@vltpkg/error-cause'
import { loadPackageJson } from 'package-json-from-dist'
import { Config } from './config/index.ts'
import type { Command, Commands } from './types.ts'
import { stdout, outputCommand } from './output.ts'

const { version } = loadPackageJson(
  import.meta.filename,
  process.env._VLT_CLI_PACKAGE_JSON,
) as {
  version: string
}

const loadCommand = async <T>(
  command: Commands[keyof Commands] | undefined,
): Promise<Command<T>> => {
  try {
    return (await import(`./commands/${command}.ts`)) as Command<T>
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
