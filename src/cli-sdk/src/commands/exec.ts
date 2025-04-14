import { joinDepIDTuple } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { Dependency } from '@vltpkg/graph'
import { install } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { exec, execFG } from '@vltpkg/run'
import { Spec } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import { XDG } from '@vltpkg/xdg'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import { walkUp } from 'walk-up-path'
import { findCmdShimIfExists } from '../../../cmd-shim/src/read.ts'
import { commandUsage } from '../config/usage.ts'
import type { ExecResult } from '../exec-command.ts'
import { ExecCommand } from '../exec-command.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

// 1. If no --package
//   a. if no arg0, ERROR
//   b. look in node_modules/.bin for arg0
//     i. if found, that is the bin
//     ii. else, options.package = arg0, arg0 = undefined
// 2. if --package
//   a. options['stale-while-revalidate-factor'] = Infinity
//   b. look in local node_modules
//   c. check for previous install in XDG.data
//   d. install it in XDG.data
// 3. If arg0 is undefined
//   a. if options.package is undefined, ERROR
//   b. get manifest for package
//   c. look for bin matching package name
// 4. Else if options.package
//   a. verify that arg0 comes from options.package
// Then, the arg0 is identified, and comes from the pkg specified,
// so just run the command.

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'exec',
    usage: '[--package=<pkg>] [command...]',
    description: `Run a command defined by a package, installing it
                  if necessary.

                  If the package specifier is provided explicitly via the
                  \`--package\` config, then that is what will be used. If
                  a satisfying instance of the named package exists in the
                  local \`node_mnodules\` folder, then that will be used.

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
    },
  })

/**
 * Find the executable in a node_modules/.bin folder between the cwd
 * and the projectRoot.
 *
 * Returns `[executable, target]` showing the package origin.
 */
const findExecutable = async (arg0: string, projectRoot: string) => {
  for (const path of walkUp(process.cwd())) {
    const bin = await findCmdShimIfExists(
      resolve(path, 'node_modules/.bin', arg0),
    )
    if (bin) return bin
    if (relative(path, projectRoot) === '') break
  }
}

/**
 * Find the nearest package in a node_modules folder begtween the cwd
 * and the projectRoot.
 */
const findPackage = async (
  name: string,
  projectRoot: string,
  packageJson: PackageJson,
  from = process.cwd(),
): Promise<undefined | [string, Manifest]> => {
  for (const path of walkUp(from)) {
    const p = resolve(path, 'node_modules', name)
    try {
      return [p, packageJson.read(p, { reload: true })]
    } catch {}
    if (relative(path, projectRoot) === '') break
  }
}

export const command: CommandFn<ExecResult> = async conf => {
  const { positionals, options } = conf
  const { projectRoot, packageJson } = options
  let pkgOption = conf.options.package
  let arg0 = positionals[0]

  if (!pkgOption) {
    console.error('no pkg option')
    if (!arg0) {
      // run without no args at all??
      throw error('Must supply a --package option and/or arguments', {
        code: 'EUSAGE',
      })
    }
    const found = await findExecutable(arg0, projectRoot)
    // if found, then that's the bin. Otherwise, that's a pkg name
    if (found) arg0 = found[0]
    else {
      pkgOption = arg0
      arg0 = undefined
    }
    console.error('got from arg0?', { pkgOption, arg0 })
  }

  let pkgTarget: undefined | [string, Manifest] = undefined
  if (pkgOption) {
    // check for local option, otherwise install in data dir
    // we can ONLY do the local option if the spec is a simple version range
    // otherwise it's too complicated to know if it's a match, and easy
    // enough to just install it externally.
    const pkgSpec = Spec.parseArgs(pkgOption)
    const { name, bareSpec } = pkgSpec.final
    // if it's just a name, we can use the local version
    if (!bareSpec) {
      pkgTarget = await findPackage(name, projectRoot, packageJson)
      console.error('got pkgTarget?', pkgTarget)
    }
    if (!pkgTarget) {
      // need to install the package, if we don't have it already

      // when running this command, a user is waiting for it, so having to
      // do an install is kind of annoying. ensure that we pull from cache
      // to the greatest degree possible, and only revalidate out of band.
      options['stale-while-revalidate-factor'] = Infinity
      const packageInfo = new PackageInfoClient(options)

      const resolution = await packageInfo.resolve(pkgSpec, options)
      console.error('resolved', pkgSpec, resolution)
      const hash = createHash('sha512')
        .update(resolution.resolved)
        .digest('hex')
      const dir = new XDG('vlt/vlx').data(hash)
      pkgTarget = await findPackage(name, dir, packageJson, dir)
      if (!pkgTarget) {
        console.error('need to install', dir)
        // TODO: prompt to opt-in to allow installing package?
        await mkdir(resolve(dir, 'node_modules/.vlt'), {
          recursive: true,
        })
        await writeFile(
          resolve(dir, 'package.json'),
          JSON.stringify({
            dependencies: {
              [pkgSpec.name]: pkgSpec.bareSpec,
            },
          }),
        )
        await install(
          {
            ...options,
            packageInfo,
            projectRoot: dir,
            monorepo: undefined,
            scurry: new PathScurry(dir),
          },
          Object.assign(
            new Map([
              [
                joinDepIDTuple(['file', '.']),
                new Map<string, Dependency>([
                  [
                    name,
                    {
                      type: 'prod',
                      spec: pkgSpec,
                    },
                  ],
                ]),
              ],
            ]),
            { modifiedDependencies: true },
          ),
        )
        const p = resolve(dir, 'node_modules', name)
        console.error('did install', p)
        pkgTarget = [p, packageJson.read(p, { reload: true })]
      }
    }
    /* c8 ignore start - should be impossible */
    if (!pkgTarget) {
      throw error('Failed to install package target', {
        spec: pkgSpec,
      })
    }
    /* c8 ignore stop */
  }

  // now if we had a package option, then pkgTarget is set
  // if arg0 isn't set, then we need to infer from the manifest
  if (!arg0) {
    /* c8 ignore start - impossible */
    if (!pkgTarget) {
      throw error('Must supply a --package option and/or arguments', {
        code: 'EUSAGE',
      })
    }
    /* c8 ignore stop */
    // infer arg0 from the manifst found at pkgTarget[1]
    const { name, version, bin } = pkgTarget[1]
    if (!bin) {
      throw error('Package executable could not be inferred', {
        name,
        version,
        found: bin,
      })
    }
    if (typeof bin === 'string') {
      arg0 = bin
    } else {
      const binName =
        name?.startsWith('@') ? name.split('/')[1] : name
      arg0 = binName && bin[binName]
    }

    if (!arg0) {
      throw error('Package executable could not be inferred', {
        name,
        version,
        found: pkgTarget[1].bin,
      })
    }
    arg0 = resolve(pkgTarget[0], arg0)
  }

  // now we have arg0! let's gooooo!!
  delete conf.options['script-shell']
  conf.options.package = pkgOption
  conf.positionals[0] = arg0
  return await new ExecCommand(conf, exec, execFG).run()
}
