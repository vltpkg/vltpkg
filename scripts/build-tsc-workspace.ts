#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

await new Promise((res, rej) => {
  spawn('tsc', ['-p', 'tsconfig.publish.json'], {
    stdio: 'inherit',
  })
    .on('close', code => {
      if (code === 0) {
        res(undefined)
      } else {
        rej(new Error(`tsc failed with exit code ${code}`))
      }
    })
    .on('error', err => rej(err))
})

if (
  process.env.npm_command === 'pack' ||
  process.env.npm_command === 'publish'
) {
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
    path.replace(/^\.\/src\//, './dist/')

  for (const [key, value] of Object.entries(pkg.exports)) {
    if (typeof value === 'string') {
      pkg.exports[key] = srcToDist(value)
    } else if (typeof value === 'object' && 'import' in value) {
      pkg.exports[key] = {
        import: {
          default: srcToDist(value.import.default),
        },
      }
    } else {
      throw new Error(
        `Unsupported export type: ${key}: ${JSON.stringify(value)}`,
      )
    }
  }

  pkg.module = srcToDist(pkg.module)

  await writeFile(
    'package.json',
    JSON.stringify(pkg, null, 2),
    'utf8',
  )
}
