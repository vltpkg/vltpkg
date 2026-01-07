#!/usr/bin/env -S node --experimental-strip-types --no-warnings

// Don't import anything except `node:` core modules.
// This script is used to easily test package manager changes by
// blowing away all node_modules directories so it should work
// even when there is nothing installed.

import { rm, stat, glob } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

const main = async () => {
  const dirs = ['node_modules']
  for await (const dir of glob('*/*/node_modules', { cwd: ROOT })) {
    dirs.push(dir)
  }

  await Promise.all(
    dirs.map(async dir => {
      const path = resolve(ROOT, dir)
      const exists = await stat(path)
        .then(f => f.isDirectory())
        .catch(() => false)
      if (exists) {
        await rm(path, { recursive: true, force: true })
        console.log(`removed ${relative(ROOT, path)}`)
      }
    }),
  )
}

main()
  .then(() => console.log('done'))
  .catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
