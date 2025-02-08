import { startGUI } from '../start-gui.ts'
import { commandUsage } from '../config/usage.ts'
import { type CommandUsage, type CommandFn } from '../types.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'gui',
    usage: '',
    description: 'Launch a graphical user interface in a browser',
  })

export const command: CommandFn<void> = async conf => {
  await startGUI({ conf })
}
