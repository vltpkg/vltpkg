// run the download-packages.js script before this one

import { mkdirSync, readdirSync, readFileSync, rmSync } from 'fs'
import pacote from 'pacote'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Pool } from '../dist/esm/pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const artifactDir = resolve(__dirname, 'fixtures/artifacts')
const targetDir = resolve(__dirname, 'fixtures/extract')

const artifacts = readdirSync(artifactDir)
  .sort(() => Math.random() - 0.5)
  .slice(0, 1000)

const reset = () => {
  console.time('reset')
  try {
    rmSync(targetDir, { recursive: true })
  } catch {}
  mkdirSync(targetDir, { recursive: true })
  console.timeEnd('reset')
}

reset()
console.error(
  `extracting ${artifacts.length} artifacts with @vltpkg/tar`,
)
console.time('@vltpkg/tar extract')
const p = new Pool()
const vltPromises = []
for (const a of artifacts) {
  const tgz = resolve(artifactDir, a)
  const target = resolve(targetDir, a.replace(/\.tgz$/, ''))
  vltPromises.push(p.unpack(readFileSync(tgz), target))
}
await Promise.all(vltPromises)
console.timeEnd('@vltpkg/tar extract')

reset()
console.error(`extracting ${artifacts.length} artifacts with pacote`)
console.time('pacote extract')
const pacotePromises = []
for (const a of artifacts) {
  const tgz = resolve(artifactDir, a)
  const target = resolve(targetDir, a.replace(/\.tgz$/, ''))
  pacotePromises.push(pacote.extract(tgz, target))
}
await Promise.all(pacotePromises)
console.timeEnd('pacote extract')

reset()
