# @vltpkg/project

Project-level utilities shared across workspaces.

**[Usage](#usage)**

## Overview

This package contains shared helpers to discover candidate project
folders, skipping well-known non-project folders in the user's home
directory.

They back the `:host()` query selector.

## Usage

```js
import { PathScurry } from 'path-scurry'
import { readProjectFolders } from '@vltpkg/project'

const folders = await readProjectFolders({
  scurry: new PathScurry(process.cwd()),
  // defaults to scanning the user's home directory
  userDefinedProjectPaths: [],
})

console.log(folders.map(folder => folder.fullpath()))
```
