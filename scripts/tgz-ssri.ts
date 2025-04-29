#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert'
import ssri from 'ssri'
import { getWorkspaces, getWorkspace } from './utils.ts'
import type { Workspace } from './utils.ts'

const findTgz = (dir: string) => {
  if (existsSync(dir)) {
    const tgz = readdirSync(dir).find(f => f.endsWith('.tgz'))
    if (tgz) {
      return join(dir, tgz)
    }
  }
}

const findPackageTgz = (ws: Workspace) =>
  findTgz(
    ws.pj.publishConfig?.directory ?
      join(ws.dir, ws.pj.publishConfig.directory)
    : ws.dir,
  )

const ssriFromFile = (file: string): string => {
  try {
    const data = readFileSync(file)
    const integrity = ssri.fromData(data)
    return integrity.toString()
  } catch (err) {
    throw new Error(
      `Failed to generate integrity for ${file}: ${err}`,
    )
  }
}

const main = (arg?: string) => {
  if (arg) {
    const tarball = findPackageTgz(getWorkspace(arg))
    assert(tarball, `Failed to find tarball for ${arg}`)
    return ssriFromFile(tarball)
  }

  const res: string[] = []

  for (const ws of getWorkspaces()) {
    const tarball = findPackageTgz(ws)

    if (!tarball) {
      continue
    }

    res.push(`${ws.pj.name}@${ws.pj.version}`)
    res.push(ssriFromFile(tarball))
    res.push('')
  }

  return res.join('\n').trim()
}

console.log(main(process.argv[2]))
