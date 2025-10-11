# @vltpkg/run

![run](https://github.com/user-attachments/assets/7546e081-c35c-44ac-a4bc-05caf88b7a2b)

Run a script defined in a `package.json` file (eg, `vlt run` and
lifecycle scripts), or an arbitrary command as if it was (eg,
`vlt exec`).

## Usage

```js
import { run, exec } from '@vltpkg/run'

const cwd = '/path/to/pkg'

// to run a script, as with `vlt run blah`
const runResult = await run({
  // the name of the thing in package.json#scripts
  event: 'build',

  // the dir where the package.json lives
  cwd,

  // if the script is not defined in package.json#scripts, just
  // ignore it and treat as success. Otherwise, treat as an
  // error. Default false.
  ignoreMissing: true,

  // extra arguments to pass into the child process
  args: ['some', 'arguments'],

  // the environment variables to add, defaults to process.env.
  // note that @vltpkg/run will add some of its own, as well:
  // - npm_lifecycle_event: the event name
  // - npm_lifecycle_script: the command in package.json#scripts
  // - npm_package_json: path to the package.json file
  // - VLT_* envs for all vlt configuration values that are set
  env: process.env,

  // set this to `true` to take over the terminal and run in the
  // foreground, inheriting the parent process's stdio
  // by default, the script runs in the background.
  // Only one foreground:true script will be run in parallel!
  foreground: true,

  // the shell to run the script in. Defaults to `${SHELL}` env
  // variable if set, otherwise the system specific shell,
  // `cmd.exe` on windows, and `/bin/sh` on posix.
  'script-shell': '/usr/bin/bash',

  // pass in a @vltpkg/package-json.PackageJson instance, and
  // it'll be used for reading the package.json file. Optional,
  // may improve performance somewhat.
  packageJson: new PackageJson(),
})

// to execute an arbitrary command, as with `vlt exec whatever`
const execResult = await exec({
  // the command to execute.
  command: 'do-something',
  args: ['some', 'arguments'],
  // other arguments all the same.
})
```

## Node-gyp Shimming

The `@vltpkg/run` package automatically provides node-gyp shimming for
commands that contain `node-gyp` references. This allows packages that
expect `node-gyp` to be available to work seamlessly with vlt's
package management system.

### How it works

When executing commands that contain references to `node-gyp`, the
package will:

1. Create a `node-gyp` shim file in the XDG runtime directory
   (typically `~/.run/vlt/run/node-gyp` on Unix or
   `%TEMP%\xdg.run\vlt\run\node-gyp.cmd` on Windows)
2. Inject the shim directory into the command's `PATH` environment
   variable
3. The shim redirects all `node-gyp` calls to `vlx node-gyp@latest`

The shim is created once per session and cached in memory for
performance. It works for both simple commands like `node-gyp rebuild`
and complex commands with shell operators like
`echo "before" && node-gyp rebuild && echo "after"`.

### Cross-platform support

The shimming system is fully cross-platform:

- **Unix/Linux/macOS**: Creates an executable shell script with
  shebang (`#!/bin/sh`)
- **Windows**: Creates a batch file (`.cmd`) that forwards arguments

### Examples

```js
// These commands will automatically use the node-gyp shim:
await run({
  cwd: '/path/to/pkg',
  arg0: 'build', // where build script is: "node-gyp rebuild"
  projectRoot: '/path/to/pkg',
})

await exec({
  arg0: 'echo "before" && node-gyp rebuild && echo "after"',
  cwd: '/path/to/pkg',
  projectRoot: '/path/to/pkg',
  'script-shell': true,
})

await exec({
  arg0: 'node-gyp',
  args: ['configure', '--debug'],
  cwd: '/path/to/pkg',
  projectRoot: '/path/to/pkg',
})

// These commands will NOT use the shim:
await exec({
  arg0: 'echo "hello"', // No node-gyp reference
  cwd: '/path/to/pkg',
  projectRoot: '/path/to/pkg',
})
```

### How to verify the shim

You can access the shim utilities to inspect or verify the setup:

```js
import {
  getNodeGypShim,
  getNodeGypShimDir,
  hasNodeGypReference,
} from '@vltpkg/run'

// Get the path to the shim file
const shimPath = await getNodeGypShim()
// e.g., '/home/user/.run/vlt/node-gyp'

// Get the directory containing the shim (for PATH injection)
const shimDir = await getNodeGypShimDir()
// e.g., '/home/user/.run/vlt'

// Check if a command contains node-gyp references
const needsShim = hasNodeGypReference('node-gyp rebuild')
// true
```

### Fallback behavior

If the shim cannot be created (e.g., due to filesystem permissions),
the error is silently caught and the command executes normally. This
ensures the command fails naturally if `node-gyp` is actually needed
but not available, providing clear error messages to the user.
