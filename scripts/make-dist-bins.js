import { dirname, resolve } from 'node:path'
import {
  statSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from 'node:fs'

// This file runs via pnpm:devPreinstall so it cannot import
// any dependencies.

// Manually add any dirs that have package.json#bin scripts that get
// linked to built dist/ files.
const DIRS = ['src/vlt']

for (const [pkgdir, { bin = {} }] of DIRS.map(d => {
  const dir = resolve(import.meta.dirname, '..', d)
  const pkg = JSON.parse(
    readFileSync(resolve(dir, 'package.json'), 'utf8'),
  )
  return [dir, pkg]
})) {
  for (const b of Object.values(bin)) {
    if (!b.startsWith('./dist')) continue
    const bin = resolve(pkgdir, b)
    try {
      statSync(bin)
    } catch {
      mkdirSync(dirname(bin), { recursive: true })
      writeFileSync(bin, '')
    }
  }
}
