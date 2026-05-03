import { mkdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { minimatch } from 'minimatch'
import { init } from '@vltpkg/init'
import { install } from '@vltpkg/graph'
import { load, save } from '@vltpkg/vlt-json'
import { assertWSConfig, asWSConfig } from '@vltpkg/workspaces'
import { commandUsage } from '../config/usage.ts'
import type { InitFileResults } from '@vltpkg/init'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'init',
    usage: '',
    description: `Initialize a new project in the current directory.
                  Creates a package.json, a .gitignore, and installs
                  dependencies so the project is ready to use immediately.`,
    options: {
      workspace: {
        value: '<path|glob>',
        description:
          'Create package.json files in matching workspaces.',
      },
    },
  })

// TODO: colorize the JSON if config.options.color
export const views = {
  human: (results: InitFileResults | InitFileResults[]) => {
    const output: string[] = []
    // if results is an array, it means multiple workspaces were initialized
    if (Array.isArray(results)) {
      for (const result of results) {
        for (const [type, value] of Object.entries(result)) {
          output.push(`Wrote ${type} to ${value.path}`)
        }
      }
    } else {
      // otherwise, it's a single result
      for (const [type, value] of Object.entries(results)) {
        if ('data' in value) {
          output.push(
            `Wrote ${type} to ${value.path}:\n\n${JSON.stringify(value.data, null, 2)}`,
          )
        } else {
          output.push(`Wrote ${type} to ${value.path}`)
        }
      }
    }
    output.push(`\nModify/add properties using \`vlt pkg\`. For example:

  vlt pkg set "description=My new project"`)
    return output.join('\n')
  },
} as const satisfies Views<InitFileResults>

export const command: CommandFn<
  InitFileResults | InitFileResults[]
> = async conf => {
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */

  if (conf.values.workspace?.length) {
    const workspacesConfig = load('workspaces', assertWSConfig)
    const parsedWSConfig = asWSConfig(workspacesConfig ?? {})
    const results: InitFileResults[] = []
    const addToConfig: string[] = []

    // create a new package.json file for every workspace
    // defined as cli --workspace options
    for (const workspace of conf.values.workspace) {
      // cwd is the resolved location of the workspace
      const cwd = resolve(conf.options.projectRoot, workspace)

      // create the folder in case it's missing
      mkdirSync(cwd, { recursive: true })

      // run the initialization script and collect results
      results.push(await init({ cwd }))

      // Check if this workspace path is covered by existing workspace patterns
      const isMatched = Object.values(parsedWSConfig).some(
        (patterns: string[]) => {
          return patterns.some(pattern =>
            minimatch(workspace, pattern),
          )
        },
      )

      // When a workspace is not matched we track it for insertion later
      if (!isMatched) {
        addToConfig.push(
          relative(conf.options.projectRoot, cwd).replace(/\\/g, '/'),
        )
      }
    }

    // if there are workspaces that were not matched by existing
    // patterns, we add them to the workspaces config
    if (addToConfig.length > 0) {
      let workspaces = workspacesConfig
      // if the original workspaces config is a string, we'll need
      // to convert it to an array in order to append the recently
      // added workspaces
      if (typeof workspacesConfig === 'string') {
        workspaces = [workspacesConfig, ...addToConfig]
      } else if (Array.isArray(workspacesConfig)) {
        // if the original workspaces config is an array, we simply
        // append the missing items to it
        workspaces = [...workspacesConfig, ...addToConfig]
      } else {
        // otherwise we assume it's an Record<string, string[]> object
        // and we'll add the new workspaces to the `packages` keys
        workspaces = workspacesConfig ?? {}
        // if the `packages` key is not being used
        if (!workspaces.packages) {
          workspaces.packages = addToConfig
        } else {
          // if the `packages` key is defined as a string, we
          // convert it to an array to append the new items
          if (typeof workspaces.packages === 'string') {
            workspaces.packages = [
              workspaces.packages,
              ...addToConfig,
            ]
          } else {
            // if it is, we simply append the new workspaces
            workspaces.packages = [
              ...workspaces.packages,
              ...addToConfig,
            ]
          }
        }
      }
      // finally, we add the new workspaces to the config file
      save('workspaces', workspaces)
    }

    // run install to set up node_modules and vlt-lock.json
    await install({ ...conf.options, allowScripts })

    return results
  }

  const result = await init({ cwd: process.cwd() })

  // run install to set up node_modules and vlt-lock.json
  await install({ ...conf.options, allowScripts })

  return result
}
