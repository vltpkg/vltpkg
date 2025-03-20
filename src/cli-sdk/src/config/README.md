# `vlt/config`

Configuration management for vlt.

## USAGE

```js
import { Config } from 'vlt/config'
import chalk from 'chalk'

const config = await Config.load()

if (config.get('color')) {
  console.log(chalk.green('hello world'))
} else {
  console.log('hello world')
}

// print usage
console.log(config.jack.usage())

// print usage as markdown
console.log(config.jack.usageMarkdown())
```

## Config Files

This module will walk up from the current working directory seeking a
project root. This is indicated by the following algorithm:

- If a `node_modules` or `package.json` file is found, record this
  path as the "likely root", but keep searching.
- If the current directory is `$HOME` or the XDG config home, stop
  searching.
- If a `.git` or `vlt-workspaces.json` file is found, use this
  directory as the project root and stop searching.
- If a `vlt.json` file is found and successfully loaded, use this
  directory as the project root and stop searching.
- If continuing to search, restart in the parent directory.
- If the search was ended without a definitive root, but a likely root
  was found, use that.
- If the search was ended without a definitive root or a likely root,
  then use the current working directory.

The project root `vlt.json` file will override values that are found
in the XDG config home `vlt/vlt.json` file.

These are further overridden by any matching `VLT_*` fields in the
environment, or options specified on the command line.

## Configuration Definitions and Patterns

All configuration options are defined in `./definition.ts`. See
[jackspeak docs](http://npm.im/jackspeak) for a full description of
the format.

`{ type: 'string', multiple: true }` options can be interpreted as a
set of `key=value` pairs, and will be saved back to a config file in
this shape. For example, you could put this in a `vlt.json` file:

```json
{
  "registries": {
    "vlt": "https://registry.vlt.sh",
    "npm": "https://registry.npmjs.org",
    "acme": "https://registry.acme.internal"
  }
}
```

However, in the environment and on the command line, where all values
_must_ be strings, these are expressed as a set of `key=value` pairs.
So these would be equivalent to the above example:

```bash
$ vlt \
  --registries npm=https://registry.npmjs.org \
  --registries vlt=https://vlt.sh
```

```bash
$ VLT_REGISTRIES=$'npm=https://registry.npmjs.org\nvlt=https://vlt.sh' \
  vlt
```

An invalid `key=value` pair (eg, lacking a `=` character) will be
parsed as `{ [key]: '' }` in the resulting Record.

## Passing to Other `@vltpkg` Modules

After loading and parsing the config files, environment, and command
line, `config.options` will be a flattened object representing the
effective current configuration.

All `@vltpkg` modules must register their user-configurable options in
the definitions provided here, such that they can be called with
`config.options` as an options argument.

Example:

```js
import { Config } from 'vlt/config'
import { PackageInfo } from '@vltpkg/package-info'

const config = await Config.load()
const pi = new PackageInfo(config.options)
const manifest = await pi.manifest('abbrev', config.options)
```

## Command Specific Configuration

Any values can be overridden in a configuration file for a given
command using a `command` object with a key of the command name.

```json
{
  "registry": "https://registry.npmjs.org/",
  "command": {
    "publish": {
      "registry": "https://internal.registry/"
    }
  }
}
```
