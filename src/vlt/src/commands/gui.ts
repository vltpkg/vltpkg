import { commandUsage } from '../config/usage.ts'
import { type CommandFn, type CommandUsage } from '../index.ts'
import { startGUI } from '../start-gui.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'gui',
    usage: '',
    description: 'Launch a graphical user interface in a browser',
  })

export const command: CommandFn<void> = async conf => {
  await startGUI({ conf })
}
