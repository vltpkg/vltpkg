# @vltpkg/config

Config utilities for the vlt client.

**[Usage](#usage)** · **[API](#api)**

## Overview

These are config utilities used by the vlt cli.

## Usage

```js
import { get, set, edit, list, del } from '@vltpkg/config'

// Assuming you have a LoadedConfig instance from @vltpkg/cli-sdk
// const conf = await loadConfig()

// Get a config value by key
const colorValue = await get(conf) // requires conf.positionals[1] to be the key name
// Supports dot notation for nested properties in record fields
// e.g., conf.positionals = ['get', 'registry.npmjs.org']

// Set config values using key=value pairs
// conf.positionals should contain pairs like ['set', 'color=auto', 'timeout=5000']
await set(conf)
// Creates config file if it doesn't exist when called with no pairs
// Supports dot notation for record fields: 'registry.npmjs.org=https://registry.npmjs.org/'

// Edit the config file with the configured editor
await edit(conf) // opens conf.get('config') file in conf.get('editor')

// List all current config values as key=value pairs
const allConfig = list(conf) // returns array of 'key=value' strings

// Delete config keys
// conf.positionals should contain keys to delete: ['del', 'color', 'timeout']
await del(conf) // removes specified keys from conf.get('config') file
```

### API

#### `get(conf: LoadedConfig)`

- Retrieves a single config value by key
- Supports dot notation for accessing nested properties in record
  fields
- Returns the value as
  `string | number | boolean | string[] | Record<string, string> | undefined`
- Requires exactly one key in `conf.positionals[1]`

#### `set(conf: LoadedConfig)`

- Sets config values from key=value pairs in `conf.positionals`
- Creates an empty config file if no pairs are provided
- Supports dot notation for record fields (e.g.,
  `registry.npmjs.org=value`)
- Writes to the config file specified by `conf.get('config')`

#### `edit(conf: LoadedConfig)`

- Opens the config file in the editor specified by
  `conf.get('editor')`
- Uses `spawnSync` to launch the editor with the config file path
- Throws an error if the editor command fails

#### `list(conf: LoadedConfig)`

- Returns all current config options as an array of 'key=value'
  strings
- Converts the internal config records to a flat list format

#### `del(conf: LoadedConfig)`

- Deletes specified config keys from the config file
- Requires at least one key in `conf.positionals` (after the command
  name)
- Removes keys from the file specified by `conf.get('config')`
