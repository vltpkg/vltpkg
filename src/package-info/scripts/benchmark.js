// run the download-packages.js script before this one

import { mkdirSync, readFileSync, rmSync } from 'fs'
import pacote from 'pacote'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { PackageInfoClient } from '../dist/esm/index.js'

console.log('smaller number is better')

// only extract a subset, or else we get rate-limited by
// the npm registry.
const extractCount = 500

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkgNames = readFileSync(
  resolve(__dirname, '1000-most-depended-packages-2019.txt'),
  'utf8',
)
  .trim()
  .split(/\r?\n/)
  // randomize order
  .sort(() => Math.random() - 0.5)
const extractDir = resolve(__dirname, 'fixtures/extract')
const cache = resolve(__dirname, 'fixtures/cache')
const cacache = resolve(__dirname, 'fixtures/cacache')

const p = new PackageInfoClient({ cache })

const reset = () => {
  try {
    rmSync(extractDir, { recursive: true })
  } catch {}
  mkdirSync(extractDir, { recursive: true })
}

const resetCache = () => {
  try {
    rmSync(cache, { recursive: true })
  } catch {}
  try {
    rmSync(cacache, { recursive: true })
  } catch {}
  mkdirSync(cache)
  mkdirSync(cacache)
  p.registryClient.cache.clear()
}

reset()
resetCache()
console.error(`resolve (cold)`)
console.time('vlt')
const vltResolves = []
for (const name of pkgNames) {
  vltResolves.push(p.resolve(name).catch(() => {}))
}
await Promise.all(vltResolves)
console.timeEnd('vlt')

reset()
console.time('npm')
const pacoteResolves = []
for (const name of pkgNames) {
  pacoteResolves.push(
    pacote.resolve(name, { cache: cacache }).catch(() => {}),
  )
}
await Promise.all(pacoteResolves)
console.timeEnd('npm')

reset()
resetCache()
console.error(`resolve (warm)`)
console.time('vlt')
const vltResolvesW = []
for (const name of pkgNames) {
  vltResolvesW.push(p.resolve(name).catch(() => {}))
}
await Promise.all(vltResolvesW)
console.timeEnd('vlt')

reset()
console.time('npm')
const pacoteResolvesW = []
for (const name of pkgNames) {
  pacoteResolvesW.push(
    pacote.resolve(name, { cache: cacache }).catch(() => {}),
  )
}
await Promise.all(pacoteResolvesW)
console.timeEnd('npm')

reset()
resetCache()
console.error(`manifests (cold)`)
console.time('vlt')
const vltManifests = []
for (const name of pkgNames) {
  vltManifests.push(p.manifest(name).catch(() => {}))
}
await Promise.all(vltManifests)
console.timeEnd('vlt')

reset()
console.time('npm')
const pacoteManifests = []
for (const name of pkgNames) {
  pacoteManifests.push(
    pacote.manifest(name, { cache: cacache }).catch(() => {}),
  )
}
await Promise.all(pacoteManifests)
console.timeEnd('npm')

reset()

console.error(`manifests (warm)`)
console.time('vlt')
const vltManifestsW = []
for (const name of pkgNames) {
  vltManifestsW.push(p.manifest(name).catch(() => {}))
}
await Promise.all(vltManifestsW)
console.timeEnd('vlt')

reset()
console.time('npm')
const pacoteManifestsW = []
for (const name of pkgNames) {
  pacoteManifestsW.push(
    pacote.manifest(name, { cache: cacache }).catch(() => {}),
  )
}
await Promise.all(pacoteManifestsW)
console.timeEnd('npm')

reset()
resetCache()
console.error('extract (cold)')
console.time('vlt')
const vltExtract = []
for (const name of pkgNames.slice(0, extractCount)) {
  vltExtract.push(p.extract(name, extractDir + '/' + name))
}
await Promise.all(vltExtract)
console.timeEnd('vlt')

reset()
console.time('npm')
const pacoteExtract = []
for (const name of pkgNames.slice(0, extractCount)) {
  pacoteExtract.push(
    pacote
      .extract(name, extractDir + '/' + name, { cache: cacache })
      .catch(() => {}),
  )
}
await Promise.all(pacoteExtract)
console.timeEnd('npm')

reset()
console.error('extract (warm)')
console.time('vlt')
const vltExtractW = []
for (const name of pkgNames.slice(0, extractCount)) {
  vltExtractW.push(
    p.extract(name, extractDir + '/' + name).catch(() => {}),
  )
}
await Promise.all(vltExtractW)
console.timeEnd('vlt')

reset()
console.time('npm')
const pacoteExtractW = []
for (const name of pkgNames.slice(0, extractCount)) {
  pacoteExtractW.push(
    pacote
      .extract(name, extractDir + '/' + name, { cache: cacache })
      .catch(e => {
        console.error(name, e)
      }),
  )
}
await Promise.all(pacoteExtractW)
console.timeEnd('npm')

reset()
resetCache()
