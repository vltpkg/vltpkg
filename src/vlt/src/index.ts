import { Config, LoadedConfig } from '@vltpkg/config'
import { error } from '@vltpkg/error-cause'
import { Monorepo } from '@vltpkg/workspaces'
import {relative} from 'path'

// Infer the workspace by being in that directory.
const vlt = await Config.load(process.cwd(), process.argv)
if (vlt.get('workspace') === undefined) {
  const cwd = process.cwd()
  const rel = relative(vlt.cwd, process.cwd()).replace(/\\/g, '/')
  const m = Monorepo.maybeLoad(vlt.cwd, {
    load: { paths: rel },
  })
  const ws = m?.get(cwd)
  if (ws) vlt.values.workspace = [ws.path]
}

export type CliCommand = {
  command: (conf: LoadedConfig) => Promise<void>
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
  await cmd.command(vlt)
}
