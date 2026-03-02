# @vltpkg/project

Project-level utilities shared across workspaces.

**[Usage](#usage)**

## Overview

This package contains shared helpers to:

- discover candidate project folders
- load a fresh CLI config for a project root
- derive project metadata used by host-context and dashboard flows

## Usage

```js
import {
  getProjectData,
  readProjectFolders,
  reloadConfig,
} from '@vltpkg/project'

const config = await reloadConfig(process.cwd())

const folders = await readProjectFolders({
  scurry: config.options.scurry,
  userDefinedProjectPaths: config.options['dashboard-root'] ?? [],
})

const projects = folders.map(folder =>
  getProjectData(
    {
      packageJson: config.options.packageJson,
      scurry: config.options.scurry,
    },
    folder,
  ),
)

console.log(projects)
```
