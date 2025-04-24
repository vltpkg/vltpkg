# @vltpkg/vlx

Executable management for `vlt exec`.

**[Usage](#usage)**

## Overview

This is a tool that provides the global installs used by `vlt exec`
(that is, when it's not a local installed dependency).

## Usage

```ts
import * as vlx from '@vltpkg/vlx'

// get the options and arguments in the normal ways
const conf: LoadedConfig = blahblahblah()

const { positionals, options } = conf

// Provide a promptFn which is `()=>Promise<string>` if you want
// to confirm before installing things. If it returns a string
// that does not start with the letter 'y', then operation will
// be aborted. If not provided, consent is assumed.
const promptFn = async (pkgSpec: Spec, path: string) => {
  const result = await createInterface(
    process.stdin,
    process.stdout,
  ).question(`Installing ${pkgSpec} in ${path}, is this ok? (y)`)
  process.stdin.pause()
  return result
}

// figure out the correct executable, adding it to the user's
// XDG.data directory if appropriate, based on the positional
// args and the package option. Other options are used
// appropriately for installation, resolution, etc.
const arg0 = await vlx.resolve(positionals, options, promptFn)

// now one of the following is true:
// - arg0 refers to a locally installed package bin
// - arg0 refers to a package bin in the XDG.data directory
// - arg0 is undefined, and an interactive shell can be executed
// - an error was thrown, because it couijld not be determined
if (arg0 === undefined) {
  doInteractiveShellOrWhatever()
} else {
  runTheCommandOrWhatever([arg0, ...positionals.slice(2)])
}

// some other stuff this can do:

// explicitly add a package install to the XDG.data dir, if
// not already present. Returns the key used to reference
// the install for removal or inspection.
const info = await vlx.install('somepkg@somespec', options)

// remove an installed instance, if present
// returns a list of paths that were removed
const removed = await vlx.delete(['somepkg'], remover, options)
const removed = await vlx.delete(['somepkg'], remover, options)

// list the paths for all installs in the XDG.data directory
const installPaths = await vlx.list()

// get information about a given install, or undefined missing
const {
  // the manifest of the synthetic vlx project depending on that package
  manifest,
  // path to the synthetic vlx project
  path,
  // the resolved package dependency, if it came from the vlx cache
  resolved,
  // the inferred default binary, if one could be determined.
  arg0,
} = await vlx.info(path, options)
```
