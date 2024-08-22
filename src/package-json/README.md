# `@vltpkg/package-json`

Manages reading `package.json` files.

Caches previously seen files and augments error messages for clarity.

## USAGE

```js
import { PackageJson } from '@vltpkg/package-json'

const packageJson = new PackageJson()
const dir = process.cwd()
const pkg = await packageJson.read(dir)
```
