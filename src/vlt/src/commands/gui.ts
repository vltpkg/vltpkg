import { fileURLToPath } from 'node:url'
import { startGUI } from '../start-gui.js'
import { commandUsage } from '../config/usage.js'
import { type CliCommandUsage, CliCommandFn } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'gui',
    usage: '',
    description: 'Launch a graphical user interface in a browser',
  })

export const command: CliCommandFn = async (
  conf,
  assetsDir: string = fileURLToPath(
    import.meta.resolve('@vltpkg/gui'),
  ),
) => {
  await startGUI({ conf, assetsDir })
}
