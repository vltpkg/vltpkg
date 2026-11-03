# @vltpkg/project

Project-level utilities shared across workspaces.

**[Usage](#usage)**

## Overview

This package contains shared helpers to:

- discover candidate project folders
- load a fresh CLI config for a project root

They back the `:host()` query selector.

## Usage

```js
import { readProjectFolders, reloadConfig } from '@vltpkg/project'

const config = await reloadConfig(process.cwd())

const folders = await readProjectFolders({
  scurry: config.options.scurry,
  userDefinedProjectPaths: config.options['dashboard-root'] ?? [],
})

console.log(folders.map(folder => folder.fullpath()))
```
