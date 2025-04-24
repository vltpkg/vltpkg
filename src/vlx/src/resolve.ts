import { error } from '@vltpkg/error-cause'
import { Spec } from '@vltpkg/spec'
import { resolve } from 'node:path'
import { addToPATH } from './add-to-path.ts'
import { findExecutable } from './find-executable.ts'
import { findPackage } from './find-package.ts'
import type { PromptFn, VlxInfo, VlxOptions } from './index.ts'
import { vlxInstall } from './install.ts'

/**
 * Figure out the `arg0` to use for an exec command.
 *
 * If `undefined` is returned, then the caller should spawn an interactive
 * shell, or in multi-workspace mode, raise an error.
 */
export const vlxResolve = async (
  positionals: string[],
  options: VlxOptions,
  promptFn?: PromptFn,
): Promise<undefined | string> => {
  const noArgs = positionals.length === 0
  let arg0 = positionals[0]
  let pkgOption = options.package
  const { projectRoot, packageJson } = options

  if (!pkgOption) {
    // can come from any package
    if (!arg0) {
      // caller will run interactive shell
      return undefined
    }

    const found = await findExecutable(arg0, projectRoot)
    // if found locally, then that's the bin, whatever the package is
    // since no package option was provided anyway.
    if (found) return found
    // ok, not local, might have to install something.
    // treat the arg0 as a package specifier
    pkgOption = arg0
    arg0 = undefined
  }

  let pkgTarget: undefined | VlxInfo = undefined

  if (pkgOption) {
    // check for local option, otherwise install in data dir we can
    // ONLY do the local option if the spec is a simple name. otherwise
    // it's too complicated to know if it's a match, especially in this
    // world of multiple registries and such, and it's easy enough to
    // just install it externally.
    const pkgSpec = Spec.parseArgs(pkgOption, options)
    const { name, bareSpec } = pkgSpec.final
    // if it's just a name, we can use the local version
    if (!bareSpec) {
      pkgTarget = await findPackage(name, projectRoot, packageJson)
    }
    pkgTarget ??= await vlxInstall(pkgSpec, options, promptFn)
  }

  if (pkgTarget) {
    addToPATH(resolve(pkgTarget.path, 'node_modules/.bin'))
    // if we now have a pkgTarget, and we did not have any arguments, then
    // the user did something like `vlx --package=foo`, but didn't give us
    // a command. In that case, we add the relevant exec-cache .bin folder to
    // the PATH env, and let the caller invoke an interactive shell.
    if (noArgs) return undefined
  }

  // now if we had a package option, then pkgTarget is set
  // if arg0 isn't set, then we need to infer from the manifest
  // This is like doing `vlx foo@version`, where we treat arg0
  // as the package option. A default exec *must* be inferred then.
  if (!arg0) {
    /* c8 ignore start - impossible, case already handled */
    if (!pkgTarget) {
      throw error('Must supply a --package option and/or arguments', {
        code: 'EUSAGE',
      })
    }
    /* c8 ignore stop */

    // infer arg0 from the manifst found at pkgTarget[1]
    arg0 = pkgTarget.arg0
    if (!arg0) {
      const { name, version, bin } = packageJson.read(
        resolve(pkgTarget.path, 'node_modules', pkgTarget.name),
      )
      throw error('Package executable could not be inferred', {
        name,
        version,
        found: bin,
      })
    }
  }

  return arg0
}
