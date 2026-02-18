import { exec, execFG } from '@vltpkg/run'
import type { PromptFn } from '@vltpkg/vlx'
import * as vlx from '@vltpkg/vlx'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline/promises'
import { commandUsage } from '../config/usage.ts'
import type { ExecResult } from '../exec-command.ts'
import { ExecCommand } from '../exec-command.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { styleTextStdout } from '../output.ts'
export { views } from '../exec-command.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'create',
    usage: '<initializer> [args...]',
    description: `Initialize a new project from a template package.

                  Works like \`npm create\` and \`bun create\`, automatically
                  prepending "create-" to the package name and executing it.

                  For example, \`vlt create react-app my-app\` will fetch and
                  execute the \`create-react-app\` package with the arguments
                  \`my-app\`.

                  If a satisfying instance of the create package exists in the
                  local \`node_modules\` folder, then that will be used.

                  At no point will \`vlt create\` change the locally installed
                  dependencies. Any installs it performs is done in vlt's XDG
                  data directory.
    `,
    examples: {
      'react-app my-app': {
        description: 'Create a new React app using create-react-app',
      },
      'vite my-project': {
        description: 'Create a new Vite project using create-vite',
      },
      '@scope/template my-app': {
        description:
          'Create a new project using @scope/create-template',
      },
    },
    options: {
      'allow-scripts': {
        value: '<query>',
        description:
          'Filter which packages are allowed to run lifecycle scripts using DSS query syntax.',
      },
    },
  })

const HOME = homedir()
export const prettyPath = (path: string) =>
  path.startsWith(HOME) ? `~${path.substring(HOME.length)}` : path

export const promptFn: PromptFn = async (
  pkgSpec,
  path,
  resolution,
) => {
  const response = await createInterface(
    process.stdin,
    process.stdout,
  ).question(
    `About to install: ${styleTextStdout(
      ['bgWhiteBright', 'black', 'bold'],
      String(pkgSpec),
    )}
from: ${styleTextStdout(
      ['bgWhiteBright', 'black', 'bold'],
      resolution,
    )}
into: ${styleTextStdout(
      ['bgWhiteBright', 'black', 'bold'],
      prettyPath(path),
    )}
Is this ok? (y) `,
  )
  process.stdin.pause()
  return response
}

export const command: CommandFn<ExecResult> = async conf => {
  const [initializer, ...args] = conf.positionals

  if (!initializer) {
    throw new Error(
      'Missing required argument: <initializer>\n\nUsage: vlt create <initializer> [args...]',
    )
  }

  // Transform the initializer to a create-* package name
  // e.g., "react-app" -> "create-react-app"
  // or "@scope/template" -> "@scope/create-template"
  let packageName: string
  if (initializer.startsWith('@')) {
    // Handle scoped packages: @scope/name -> @scope/create-name
    const [scope, name] = initializer.split('/')
    packageName = name ? `${scope}/create-${name}` : `${scope}/create`
  } else {
    // Handle regular packages: name -> create-name
    packageName = `create-${initializer}`
  }

  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */

  // Use vlx to resolve the create-* package
  const arg0 = await vlx.resolve(
    [packageName, ...args],
    {
      ...conf.options,
      query: undefined,
      allowScripts,
    },
    promptFn,
  )

  // Set positionals to the resolved command and its args
  if (arg0) conf.positionals[0] = arg0
  conf.positionals.splice(1, 1)
  conf.positionals.push(...args)

  // Execute the create package
  delete conf.options['script-shell']
  return await new ExecCommand(conf, exec, execFG).run()
}
