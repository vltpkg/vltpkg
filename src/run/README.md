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
shell commands that contain `node-gyp` references. This allows
packages that expect `node-gyp` to be available to work seamlessly
with vlt's package management system.

### How it works

When executing shell commands that contain references to `node-gyp`,
the package will:

1. Check if bash is available on the system
2. If available, inject a bash alias:
   `alias node-gyp='vlx node-gyp@latest'`
3. Execute the command in a bash shell with alias expansion enabled

This works for both simple commands like `node-gyp rebuild` and
complex commands with shell operators like
`echo "before" && node-gyp rebuild && echo "after"`.

### Examples

```js
// These commands will automatically use the node-gyp alias:
await run({
  cwd: '/path/to/pkg',
  arg0: 'build', // where build script is: "node-gyp rebuild"
  projectRoot: '/path/to/pkg',
  'script-shell': true,
})

await exec({
  arg0: 'node-gyp rebuild', // Simple command with node-gyp
  cwd: '/path/to/pkg',
  projectRoot: '/path/to/pkg',
  'script-shell': true,
})

await exec({
  arg0: 'echo "before" && node-gyp rebuild && echo "after"',
  cwd: '/path/to/pkg',
  projectRoot: '/path/to/pkg',
  'script-shell': true,
})

// These commands will NOT use the alias:
await exec({
  arg0: 'echo "hello"', // No node-gyp reference
  cwd: '/path/to/pkg',
  projectRoot: '/path/to/pkg',
  'script-shell': true,
})

await exec({
  arg0: 'node-gyp rebuild', // Has node-gyp but not shell execution
  cwd: '/path/to/pkg',
  projectRoot: '/path/to/pkg',
  'script-shell': false, // Not shell execution
})
```

### Requirements

- **Bash**: The shimming requires bash to be available in the system
  PATH
- **Shell execution**: Only applies to commands executed with shell
  enabled (`'script-shell': true`)
- **Node-gyp detection**: Triggers for any command containing
  `node-gyp`

### Fallback behavior

If bash is not available or the command doesn't meet the criteria for
shimming, the command will be executed normally without any
modifications. This ensures compatibility with systems that don't have
bash installed or for commands that don't need the shimming.
