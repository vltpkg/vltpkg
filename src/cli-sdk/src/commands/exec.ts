import { exec, execFG } from '@vltpkg/run'
import type { PromptFn } from '@vltpkg/vlx'
import * as vlx from '@vltpkg/vlx'
import { homedir } from 'node:os'
import { env, platform } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { commandUsage } from '../config/usage.ts'
import type { ExecResult } from '../exec-command.ts'
import { ExecCommand } from '../exec-command.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { styleTextStdout } from '../output.ts'
export { views } from '../exec-command.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'exec',
    usage: '[--package=<pkg>] [--call=<cmd>] [command...]',
    description: `Run a command defined by a package, installing it
                  if necessary.

                  If the package specifier is provided explicitly via the
                  \`--package\` config, then that is what will be used. If
                  a satisfying instance of the named package exists in the
                  local \`node_modules\` folder, then that will be used.

                  If \`--package\` is not set, then vlt will attempt to infer
                  the package to be installed if necessary, in the following
                  manner:

                  - If the first argument is an executable found in the
                    \`node_modules/.bin\` folder (ie, provided by an
                    installed direct dependency), then that will be used.
                    The search stops, and nothing will be installed.
                  - Otherwise, vlt attempts to resolve the first argument
                    as if it was a \`--package\` option, and then swap it
                    out with the "default" executable provided by that
                    package.

                  The "default" executable provided by a package is:

                  - If the package provides a single executable string in the
                    \`bin\` field, then that is the executable to use.
                  - Otherwise, if there is a \`bin\` with the same name
                    as the package (or just the portion after the \`/\` in
                    the case of scoped packages), then that will be used.

                  If the appropriate excutable cannot be determined, then
                  an error will be raised.

                  At no point will \`vlt exec\` change the locally installed
                  dependencies. Any installs it performs is done in vlt's XDG
                  data directory.
    `,
    examples: {
      '--package typescript@5 tsc': {
        description: 'Run tsc provided by typescript version 5',
      },
      'eslint src/file.js': {
        description: 'Run the default bin provided by eslint',
      },
      'eslint@9.24 src/file.js': {
        description:
          'Run the default bin provided by eslint version 9.24',
      },
      'create-react-app --call="echo $PWD"': {
        description:
          'Install create-react-app and run an arbitrary command with its bins in PATH',
      },
      '--call="echo $PWD" --scope=":workspace"': {
        description:
          'Run an arbitrary command in the context of each workspace',
      },
    },
    options: {
      package: {
        value: '<specifier>',
        description: 'Explicitly set the package to search for bins.',
      },
      call: {
        value: '<cmd>',
        description:
          'Run an arbitrary command string after installing any specified package and adding its bins to PATH.',
      },
      'allow-scripts': {
        value: '<query>',
        description:
          'Filter which packages are allowed to run lifecycle scripts using DSS query syntax.',
      },
      scope: {
        value: '<query>',
        description: 'Filter execution targets using a DSS query.',
      },
      workspace: {
        value: '<path|glob>',
        description:
          'Limit execution to matching workspace paths or globs.',
      },
      'workspace-group': {
        value: '<name>',
        description: 'Limit execution to named workspace groups.',
      },
      recursive: {
        description: 'Run across all selected workspaces.',
      },
      'if-present': {
        description:
          'When running across multiple packages, only include packages with matching scripts.',
      },
      bail: {
        description:
          'When running across multiple workspaces, stop on first failure.',
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
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const callOption = conf.get('call')
  if (callOption) {
    // Install any specified package and add its bins to PATH, but don't
    // use its default executable - the --call string is the command to run.
    // Only install when a package is explicitly defined (via --package flag
    // or as a positional argument). Don't prompt for confirmation since the
    // user's explicit --call command implies consent.
    const pkgOption = conf.get('package') ?? conf.positionals[0]
    if (pkgOption) {
      await vlx.resolve(
        [],
        {
          ...conf.options,
          package: pkgOption,
          query: undefined,
          allowScripts,
        },
        // no promptFn: install silently since --call implies user consent
      )
    }
    // Determine the shell to use for the --call command
    const shell =
      conf.get('script-shell') ??
      env.SHELL ??
      /* c8 ignore next */
      (platform === 'win32' ? 'cmd.exe' : '/bin/sh')
    // cmd.exe uses '/c', all other shells use '-c'
    /* c8 ignore next */
    const shellFlag = shell === 'cmd.exe' ? '/c' : '-c'
    // Replace positionals with [shell, shellFlag, callOption]
    conf.positionals.splice(
      0,
      conf.positionals.length,
      shell,
      shellFlag,
      callOption,
    )
  } else {
    const arg0 = await vlx.resolve(
      conf.positionals,
      {
        ...conf.options,
        query: undefined,
        allowScripts,
      },
      promptFn,
    )
    if (arg0) conf.positionals[0] = arg0
  }
  // now we have arg0! let's gooooo!!
  delete conf.options['script-shell']
  return await new ExecCommand(conf, exec, execFG).run()
}
