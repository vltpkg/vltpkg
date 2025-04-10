import { error } from '@vltpkg/error-cause'
import { relative, resolve } from 'node:path'
import { walkUp } from 'walk-up-path'
import { findCmdShimIfExists } from '../../../cmd-shim/src/read.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import {Spec} from '@vltpkg/spec'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'exec',
    usage: '[--package=<pkg>] [command...]',
    description: `Run a command defined by a package, installing it
                  if necessary.

                  If the package specifier is provided explicitly via the
                  \`--package\` config, then that is what will be used.

                  If \`--package\` is not set, then vlt will attempt to infer
                  the package to be installed. This is done in the following
                  manner:

                  - If the first argument is an executable found in the
                    \`node_modules/.bin\` folder (ie, provided by an
                    installed dependency), then that will be used. The
                    search stops, and nothing will be installed.
                  - Otherwise, vlt attempts to resolve the first argument
                    as if it was a \`--package\` option, and then swap it
                    out with the "default" executable provided by that
                    package.

                  The "default" executable provided by a package is
                  determined in the following manner:

                  - If the package provides a single executable in the
                    \`bin\` field, then that is the answer.
                  - Otherwise, if there is a \`bin\` with the same name
                    as the package (just the portion after the \`/\` in
                    the case of scoped packages), then that will be used.

                  If the appropriate excutable cannot be determined, then
                  an error will be raised.

                  If a locally installed package is present which satisfies
                  the required package to be installed, then that will be
                  used, rather than attempting to install a new version.

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
    },
  })

// given a bin, find the nearest node_modules/pkgname
const packageFromBin = (bin: string) => {
  const nm = bin.replace(/\\+/g, '/').lastIndexOf('/node_modules/')
  if (nm === -1) return undefined
  const stem = bin.substring(nm + '/node_modules/'.length).split('/')
  const [scope, pkg] = stem
  const name = scope?.startsWith('@') && pkg ? `${scope}/${pkg}` : scope
  if (!name) return undefined
  return resolve(bin.substring(0, nm), 'node_modules', name)
}

export const command: CommandFn<string> = async conf => {
  // see if we have an explicit package to install. otherwise, the first
  // argument is the package to fetch, assuming that it has a bin.
  const { options, positionals } = conf
  const {package: pkg, projectRoot, packageJson } = options
  const pkgSpec = pkg ? Spec.parseArgs(pkg, options) : undefined
  const [ arg0, ...args ] = positionals
  if (!arg0) {
    throw error('Must supply command to run', { code: 'EUSAGE' })
  }

  // if we have a pkgSpec, then see if a local pkg can satisfy the 

  // if the arg0 is a bin in a node_modules/.bin in the current project,
  // and it comes from a matching local dependency (if one was specified)
  // then use that.
  let bin: string | undefined = undefined
  for (const path of walkUp(process.cwd())) {
    const found = await findCmdShimIfExists(
      resolve(path, 'node_modules/.bin', arg0),
    )
    if (!found) continue

    if (found) {
      const [from, to] = found
      // 
      const pkgFolder = packageFromBin(to)
      if (!pkgFolder) continue
      if (packageJson.read(pkgFolder)
    }
    if (!relative(path, projectRoot)) {
      break
    }
  }

  // check to see if we have a bin by that name. We choose the nearest
  // so that we will can up a bin in the node_modules of a workspace if
  // we are in that cwd.

  return [
    'TODO: exec-local, but install if not present',
    ...conf.positionals,
  ].join('\n')
}
