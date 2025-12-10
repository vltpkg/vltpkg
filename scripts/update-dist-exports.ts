#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { readFile, writeFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile('package.json', 'utf8')) as {
  exports: Record<
    string,
    | string
    | {
        import: {
          default: string
        }
      }
  >
  module: string
}

const srcToDist = (path: string) =>
  path.replace(/^\.\/src\//, './dist/').replace(/\.ts$/, '.js')

pkg.module = srcToDist(pkg.module)

for (const [key, value] of Object.entries(pkg.exports)) {
  if (typeof value === 'string') {
    pkg.exports[key] = srcToDist(value)
    continue
  }

  if (typeof value === 'object' && 'import' in value) {
    pkg.exports[key] = {
      import: {
        default: srcToDist(value.import.default),
      },
    }
    continue
  }

  throw new Error(
    `Unsupported export type: ${key}: ${JSON.stringify(value)}`,
  )
}

await writeFile('package.json', JSON.stringify(pkg, null, 2), 'utf8')
