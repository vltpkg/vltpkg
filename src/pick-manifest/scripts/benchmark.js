import { readdirSync, readFileSync } from 'fs'
import npmPickManifest from 'npm-pick-manifest'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { pickManifest } from '../dist/esm/index.js'
import { resolve } from 'path'

console.log('bigger number is better')

const num = n =>
  String(Math.floor(n)).padStart(3) +
  '.' +
  String(n - Math.floor(n)).substring(2, 6)

const test = (fn, howLong = 1000) => {
  const start = performance.now()
  const end = start + howLong
  let count = 0
  while (performance.now() < end) {
    fn()
    count += packuments.length
  }
  return num(count / (performance.now() - start))
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pakuDir = resolve(__dirname, 'fixtures/artifacts')
const packuments = readdirSync(pakuDir).map(p =>
  JSON.parse(readFileSync(resolve(pakuDir, p), 'utf8')),
)

const vltStar = () => {
  for (const paku of packuments) {
    pickManifest(paku, '*')
  }
}
const npmStar = () => {
  for (const paku of packuments) {
    try {
      npmPickManifest(paku, '*')
    } catch {}
  }
}
const vltGte = () => {
  for (const paku of packuments) {
    pickManifest(paku, '>=1.2.3')
  }
}
const npmGte = () => {
  for (const paku of packuments) {
    try {
      npmPickManifest(paku, '>=1.2.3')
    } catch {}
  }
}
const vltCaret = () => {
  for (const paku of packuments) {
    pickManifest(paku, '^1.2.3')
  }
}
const npmCaret = () => {
  for (const paku of packuments) {
    try {
      npmPickManifest(paku, '^1.2.3')
    } catch {}
  }
}
const vltBefore = () => {
  for (const paku of packuments) {
    pickManifest(paku, '*', { before: '2020-01-01' })
  }
}
const npmBefore = () => {
  for (const paku of packuments) {
    try {
      npmPickManifest(paku, '*', { before: '2020-01-01' })
    } catch {}
  }
}

console.error('vlt * ', test(vltStar))
console.error('npm * ', test(npmStar))
console.error('vlt >=', test(vltGte))
console.error('npm >=', test(npmGte))
console.error('vlt ^ ', test(vltCaret))
console.error('npm ^ ', test(npmCaret))
console.error('vlt bf', test(vltBefore))
console.error('npm bf', test(npmBefore))
