# @vltpkg/patch

Patch management utilities for the vlt package manager.

This package provides functionality to create and apply patches to
installed packages, similar to `pnpm patch` or `patch-package`.

## Features

- Create unified diff patches from modified packages
- Apply patches to packages during installation
- Manage patch metadata in `vlt.json`
- Store patches in `.vlt/patches` directory

## Usage

```typescript
import { PatchManager } from '@vltpkg/patch'

const patchManager = new PatchManager('/path/to/project')

// Create a patch
await patchManager.create(
  '/path/to/original/package',
  '/path/to/modified/package',
  'package-name',
  '1.0.0',
)

// Apply a patch
await patchManager.apply(
  'package-name',
  '1.0.0',
  '/path/to/package/to/patch',
)

// Get all patched packages
const patchedPackages = patchManager.getPatchedPackages()
```

## License

BSD-2-Clause-Patent
