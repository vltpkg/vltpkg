# @vltpkg/init

Project initialization logic for `vlt`.

**[Usage](#usage)**

## Overview

This is a tool that provides the project initialization logic used by
the vlt cli.

## Usage

```js
import { init } from '@vltpkg/init'

// initalize a project
const results = await init({ cwd: '/some/path' })

// now results contains { manifest: { path, data }}
```

```js
import { initSkill } from '@vltpkg/init'

// create skills/my-skill/SKILL.md, or a root SKILL.md with no name
const { skill, manifest } = initSkill({
  cwd: '/some/path',
  name: 'my-skill',
})

// skill = { name, path }, manifest = { path, added } when the
// package.json `files` got the skill added
```
