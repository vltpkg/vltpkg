import { commandUsage } from '../config/usage.ts'
import {
  type CommandUsage,
  type CommandFnResultOnly,
} from '../types.ts'
import { init, type InitResult } from '../init.ts'

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
