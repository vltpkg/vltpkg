# @vltpkg/init

Project initialization logic for `vlt`.

**[Usage](#usage)**

## Overview

This is a tool that provides the project initialization logic
used by the vlt cli and gui.

## Usage

```js
import { init } from '@vltpkg/init'

// initalize a project
const results = await init({ cwd: '/some/path' })

// now results contains { manifest: { path, data }}
```
