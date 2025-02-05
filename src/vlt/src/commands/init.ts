import { commandUsage } from '../config/usage.js'
import {
  type CommandUsage,
  type CommandFnResultOnly,
} from '../types.js'
import { init, type InitResult } from '../init.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'init',
    usage: '',
    description: `Create a new package.json file in the current directory.`,
  })

export const command: CommandFnResultOnly<InitResult> = async () => {
  return {
    result: await init(),
  }
}
