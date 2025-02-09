import t from 'tap'
import { isResponseOK } from '../src/worker.ts'
import { Pool } from '../src/pool.ts'

import { lstatSync } from 'fs'
import { availableParallelism } from 'os'
import { resolve } from 'path'
import { makeTar } from './fixtures/make-tar.ts'

const p = new Pool()
t.equal(p.jobs, 8 * (Math.max(availableParallelism(), 2) - 1))

// make it smaller so we can cover the contention cases
p.jobs = 2

const makePkg = (name: string, version: string): Buffer => {
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

const makePkgFlat = (name: string, version: string): Buffer => {
  const p = makePkg(name, version)
  const b = Buffer.allocUnsafeSlow(p.length)
  for (let i = 0; i < p.length; i++) b[i] = p[i]!
  if (b.byteOffset !== 0)
    throw new Error('got an offset of not zero??')
  return b
}

const makeJob = (
  name: string,
  version: string,
  flat = false,
): [string, Buffer] => {
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

const reqs: [string, Buffer][] = []
const flatReqs: [string, Buffer][] = []
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
    reqs.map(async ([target, tarData]) =>
      p.unpack(tarData, resolve(d, target)),
    ),
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
    flatReqs.map(async ([target, tarData]) =>
      p.unpack(tarData, resolve(d, target)),
    ),
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

t.test('response ok/error checking', t => {
  t.equal(isResponseOK({ id: 1, ok: true }), true)
  t.equal(isResponseOK({ id: 1, error: 'x' }), false)
  t.equal(isResponseOK({ ok: true }), false, 'id required')
  t.end()
})
