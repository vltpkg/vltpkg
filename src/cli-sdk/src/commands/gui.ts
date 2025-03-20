import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { startGUI } from '../start-gui.ts'
import type { ViewFn } from '../view.ts'

// this command is only a view, it doesn't actually do anything at this time
export const views: ViewFn<null> = async (_, __, conf) => {
  await startGUI(conf)
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'gui',
    usage: '',
    description: 'Launch a graphical user interface in a browser',
  })

export const command: CommandFn = async () => null
