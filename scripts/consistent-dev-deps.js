import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const wsdir = resolve(__dirname, '../src')
const root = resolve(__dirname, '..')
const rootPJ = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
)

const keyOrder = new Map(
  [
    'name',
    'description',
    'version',
    'tshy',
    'bin',
    'dependencies',
    'devDependencies',
    'scripts',
    'tap',
    'prettier',
    'main',
    'types',
    'type',
  ].map((k, i) => [k, i]),
)

const sortObject = o =>
  Object.fromEntries(
    Object.entries(o).sort(([a], [b]) => {
      const ai = keyOrder.get(a)
      const bi = keyOrder.get(b)
      return (
        ai !== undefined && bi !== undefined ? ai - bi
        : ai !== undefined ? -1
        : bi !== undefined ? 1
        : a.localeCompare(b, 'en')
      )
    }),
  )

for (const w of readdirSync(wsdir)) {
  const pf = resolve(wsdir, w, 'package.json')
  const pj = sortObject(JSON.parse(readFileSync(pf, 'utf8')))
  const { devDependencies } = pj
  if (devDependencies) {
    for (const k of Object.keys(devDependencies)) {
      if (
        k.startsWith('@vltpkg/') &&
        devDependencies[k].startsWith('workspace:')
      ) {
        continue
      }
      if (rootPJ.devDependencies[k] === undefined) {
        throw new Error(
          'external devDep must be declared on top level',
          {
            cause: {
              path: pf,
              found: k,
              spec: `${k}@${devDependencies[k]}`,
            },
          },
        )
      }
      devDependencies[k] = rootPJ.devDependencies[k]
    }
  }
  if (pj.tshy) pj.tshy.selfLink = false
  writeFileSync(pf, JSON.stringify(pj, null, 2) + '\n')
}
