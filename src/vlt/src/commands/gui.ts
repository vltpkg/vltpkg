import { fileURLToPath } from 'node:url'
import type { LoadedConfig } from '../config/index.js'
import { startGUI } from '../start-gui.js'
import { commandUsage } from '../config/usage.js'
import { type CliCommand } from '../types.js'

export const usage: CliCommand['usage'] = () =>
  commandUsage({
    command: 'gui',
    usage: '',
    description: 'Launch a graphical user interface in a browser',
  })

export const command = async (
  conf: LoadedConfig,
  _opts: unknown,
  assetsDir: string = fileURLToPath(
    import.meta.resolve('@vltpkg/gui'),
  ),
) => {
  await startGUI({ conf, assetsDir })
}
