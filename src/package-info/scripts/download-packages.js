// run this script as many times in parallel as necessary
// it'll randomize and skip any it's already downloaded.
import { randomBytes } from 'crypto'
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  renameSync,
} from 'fs'
import pacote from 'pacote'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { gunzipSync } from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const names = readFileSync(
  resolve(__dirname, '1000-most-depended-packages-2019.txt'),
  'utf8',
)
  .trim()
  .split(/\n/)
  .sort(() => Math.random() - 0.5)

const tarDir = resolve(__dirname, 'fixtures/artifacts')

console.log('downloading artifacts...')
const cols = process.stdout.columns
for (const n of names) {
  const tarFile = resolve(
    tarDir,
    `${n.replace(/\//, '-').replace(/^@/, '')}.tar`,
  )
  mkdirSync(dirname(tarFile), { recursive: true })
  if (existsSync(tarFile)) continue
  const tmp = tarFile + '.' + randomBytes(6).toString('hex')
  process.stdout.write(n + ' '.repeat(cols - n.length - 1) + '\r')
  try {
    writeFileSync(
      tmp,
      gunzipSync(await pacote.tarball(`${n}@latest`)),
    )
    renameSync(tmp, tarFile)
  } catch (er) {
    console.error(n + ': ' + er.message)
  }
  process.stdout.write(n + ' '.repeat(cols - n.length - 1) + '\n')
}
