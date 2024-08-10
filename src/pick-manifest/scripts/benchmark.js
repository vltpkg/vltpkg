import { readFileSync } from 'fs'
import npmPickManifest from 'npm-pick-manifest'
import { pickManifest } from '../dist/esm/index.js'
import { resolve } from 'path'
import {
  copyPackuments,
  numToFixed,
  resetDir,
  runFor,
} from '@vltpkg/benchmark'

const source = resolve(import.meta.dirname, 'fixtures/artifacts')

const packuments = copyPackuments(source).map(p =>
  JSON.parse(readFileSync(resolve(p.parentPath, p.name), 'utf-8')),
)

const test = (name, comp, fn, howLong) => {
  process.stdout.write(`${name} ${comp.padEnd(3)}`)
  const { errors, iterations, per } = runFor(
    i => fn(packuments[i % packuments.length]),
    howLong,
  )
  const errMsg =
    errors ?
      ` - errors: ${numToFixed((errors / iterations) * 100, { decimals: 1 })}%`
    : ''
  process.stdout.write(
    numToFixed(per, { padStart: 3, decimals: 4 }) + errMsg + '\n',
  )
}

const compare = (comp, args) => {
  test('vlt', comp, p => pickManifest(p, ...args))
  test('npm', comp, p => npmPickManifest(p, ...args))
}

console.log('picks per ms (bigger number is better)')
compare('*', ['*'])
compare('>=', ['>=1.2.3'])
compare('^', ['^1.2.3'])
compare('bf', ['*', { before: '2020-01-01' }])

resetDir(source)
