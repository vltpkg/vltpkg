import * as fs from 'node:fs'
import { dirname, resolve } from 'node:path'

const pkgdir = process.cwd()
const { bin = {} } = JSON.parse(
  fs.readFileSync(pkgdir + '/package.json'),
)

for (const b of Object.values(bin)) {
  if (!b.startsWith('./dist')) continue
  const bin = resolve(pkgdir, b)
  try {
    fs.statSync(bin)
  } catch {
    fs.mkdirSync(dirname(bin), { recursive: true })
    fs.writeFileSync(bin, '')
  }
}
