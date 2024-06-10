import {
  mkdirSync,
  writeFileSync,
  statSync,
  readFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkgdir = dirname(__dirname)
const pj = JSON.parse(readFileSync(pkgdir + '/package.json'))
const bins = pj.bin
for (const b of Object.values(bins)) {
  const bin = resolve(pkgdir, b)
  try {
    statSync(bin)
  } catch {
    mkdirSync(dirname(bin), { recursive: true })
    writeFileSync(bin, '')
  }
}
