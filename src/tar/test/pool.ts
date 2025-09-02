import t from 'tap'
import { Pool } from '../src/pool.ts'

import { lstatSync } from 'node:fs'
import { resolve } from 'node:path'
import { makeTar } from './fixtures/make-tar.ts'

const p = new Pool()

const makePkg = (name: string, version: string): Uint8Array => {
  const pj = { name, version }
  const json = JSON.stringify(pj)
  return makeTar([
    {
      path: 'package/package.json',
      size: json.length,
      type: 'File',
    },
    json,
  ])
}

const makePkgFlat = (name: string, version: string): Uint8Array => {
  const p = makePkg(name, version)
  const b = new Uint8Array(p.length)
  for (let i = 0; i < p.length; i++) b[i] = p[i]!
  if (b.byteOffset !== 0)
    throw new Error('got an offset of not zero??')
  return b
}

const makeJob = (
  name: string,
  version: string,
  flat = false,
): [string, Uint8Array] => {
  return [
    `node_modules/.vlt/registry.npmjs.org/${name}/${version}/node_modules/${name}`,
    (flat ? makePkgFlat : makePkg)(name, version),
  ]
}

const names = ['asdf', 'foo', 'bar']
const versions = [
  '1.0.0',
  '1.0.1',
  '1.0.2',
  '1.1.0',
  '1.1.1',
  '1.1.2',
  '1.2.0',
  '1.2.1',
  '1.2.2',
]

const reqs: [string, Uint8Array][] = []
const flatReqs: [string, Uint8Array][] = []
for (const name of names) {
  for (const version of versions) {
    reqs.push(makeJob(name, version))
    flatReqs.push(makeJob(name, version, true))
  }
}

t.same(reqs, flatReqs, 'reqs and flatreqs the same', { bail: true })

t.test('unpack all the things!', async t => {
  const d = t.testdir()
  const results = await Promise.all(
    reqs.map(async ([target, tarData]) => {
      const uint8Array = new Uint8Array(
        tarData.buffer,
        tarData.byteOffset,
        tarData.byteLength,
      )
      return p.unpack(uint8Array, resolve(d, target)).catch(er => {
        t.fail({ target, error: er })
      })
    }),
  )
  t.strictSame(
    results,
    reqs.map(() => undefined),
    'no return values',
  )
  for (const [target] of reqs) {
    t.equal(
      lstatSync(resolve(d, target, 'package.json')).isFile(),
      true,
    )
  }
})

t.test('unpack all the things, but flattened', async t => {
  const d = t.testdir()
  const results = await Promise.all(
    flatReqs.map(async ([target, tarData]) => {
      const uint8Array = new Uint8Array(
        tarData.buffer,
        tarData.byteOffset,
        tarData.byteLength,
      )
      return p.unpack(uint8Array, resolve(d, target))
    }),
  )
  t.strictSame(
    results,
    flatReqs.map(() => undefined),
    'no return values',
  )
  for (const [target] of flatReqs) {
    t.equal(
      lstatSync(resolve(d, target, 'package.json')).isFile(),
      true,
    )
  }
  t.end()
})

t.test('destroy pool', async () => {
  await p.destroy()
})
