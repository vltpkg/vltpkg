import { startGUI } from '../start-gui.js'
import { commandUsage } from '../config/usage.js'
import { type CommandUsage, type CommandFn } from '../types.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'gui',
    usage: '',
    description: 'Launch a graphical user interface in a browser',
  })

export const command: CommandFn<void> = async conf => {
  await startGUI({ conf })
}
