import { error } from '@vltpkg/error-cause'
import { Monorepo } from '@vltpkg/workspaces'
import { Config, LoadedConfig } from './config/index.js'
import { PathScurry } from 'path-scurry'
import { PackageJson } from '@vltpkg/package-json'
import { CliCommandOptions } from './types.js'

export * from './config/index.js'

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

export type CliCommand = {
  command: (
    conf: LoadedConfig,
    options: CliCommandOptions,
  ) => Promise<void>
  usage: string
}

let cmd: CliCommand
try {
  cmd = (await import(`./commands/${vlt.command}.js`)) as CliCommand
  /* c8 ignore start - should not be possible, just a failsafe */
} catch (e) {
  throw error('Command not implemented', {
    found: vlt.command,
    cause: e as Error,
  })
}
/* c8 ignore stop */

if (vlt.get('help')) {
  console.log(cmd.usage)
} else {
  // TODO: if it throws, pass to central error handler
  await cmd.command(vlt, {
    monorepo,
    packageJson,
    scurry,
  })
}
