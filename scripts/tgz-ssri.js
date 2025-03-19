#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import ssri from 'ssri'
import { getWorkspaces, readPkgJson } from './utils.ts'
import { join } from 'node:path'

const findTgz = dir => {
  if (existsSync(dir)) {
    const tgz = readdirSync(dir).find(f => f.endsWith('.tgz'))
    if (tgz) {
      return join(dir, tgz)
    }
  }
}

const findPackageTgz = dir => {
  const pkg = readPkgJson(dir)
  return [
    findTgz(
      pkg.publishConfig?.directory ?
        join(dir, pkg.publishConfig.directory)
      : dir,
    ),
    pkg,
  ]
}

const ssriFromFile = file =>
  ssri.fromData(readFileSync(file)).toString()

if (process.argv[2]) {
  const [tarball] = findPackageTgz(process.argv[2])
  console.log(ssriFromFile(tarball))
  process.exit(0)
}

const res = []

for (const dir of getWorkspaces()) {
  const [tarball, pkg] = findPackageTgz(dir)

  if (!tarball) {
    continue
  }

  res.push(`${pkg.name}@${pkg.version}`)
  res.push(ssriFromFile(tarball))
  res.push('')
}

console.log(res.join('\n').trim())
