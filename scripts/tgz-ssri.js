import { existsSync, readFileSync, readdirSync } from 'node:fs'
import ssri from 'ssri'
import { getWorkspaces, readPkgJson } from './utils.js'
import { join } from 'node:path'

const workspaces = getWorkspaces()
  .map(dir => [dir, readPkgJson(dir)])
  .sort(([, a], [, b]) => a.name.localeCompare(b.name))

const findTgz = dir => {
  if (existsSync(dir)) {
    const tgz = readdirSync(dir).find(f => f.endsWith('.tgz'))
    if (tgz) {
      return join(dir, tgz)
    }
  }
}

const res = []

for (const [dir, pkg] of workspaces) {
  const tarball = findTgz(
    pkg.publishConfig?.directory ?
      join(dir, pkg.publishConfig.directory)
    : dir,
  )

  if (!tarball) {
    continue
  }

  res.push(`${pkg.name}@${pkg.version}`)
  res.push(ssri.fromData(readFileSync(tarball)).toString())
  res.push('')
}

console.log(res.join('\n').trim())
