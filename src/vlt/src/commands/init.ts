import { commandUsage } from '../config/usage.ts'
import { type CommandFn, type CommandUsage } from '../index.ts'
import { init, type InitFileResults } from '../init.ts'
import { type ViewFn, type Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'init',
    usage: '',
    description: `Create a new package.json file in the current directory.`,
  })

export const views: Views<InitFileResults> & {
  human: ViewFn<InitFileResults>
} = {
  human: (results, _options, _config) => {
    const output: string[] = []
    // TODO: colorize the JSON if config.options.color
    for (const [type, { path, data }] of Object.entries(results)) {
      output.push(`Wrote ${type} to ${path}:

${JSON.stringify(data, null, 2)}
`)
    }
    output.push(`Modify/add properties using \`vlt pkg\`. For example:

  vlt pkg set "description=My new project"`)
    return output.join('\n')
  },
}

export const command: CommandFn<InitFileResults> = async () =>
  await init({ cwd: process.cwd() })
