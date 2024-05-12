import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const bin = resolve(dirname(__dirname), 'dist/esm/unzip.js')
try {
  statSync(bin)
} catch {
  mkdirSync(dirname(bin), { recursive: true })
  writeFileSync(bin, '')
}
