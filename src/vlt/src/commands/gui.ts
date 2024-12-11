import { fileURLToPath } from 'node:url'
import { startGUI } from '../start-gui.js'
import { commandUsage } from '../config/usage.js'
import { type CommandUsage, type CommandFn } from '../types.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'gui',
    usage: '',
    description: 'Launch a graphical user interface in a browser',
  })

export const command: CommandFn = async (
  conf,
  assetsDir: string = fileURLToPath(
    import.meta.resolve('@vltpkg/gui'),
  ),
) => {
  await startGUI({ conf, assetsDir })
}
