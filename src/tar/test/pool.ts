import { Pool, isResponseOK, isResponseError } from "../dist/esm/pool.js";
import t from 'tap'

import { makeTar } from "./fixtures/make-tar.js";
import {availableParallelism} from "os";
import {resolve} from "path";
import {lstatSync, statSync} from "fs";

const p = new Pool()
t.equal(p.jobs, Math.max(availableParallelism(), 2) - 1)

const makePkg = (name: string, version: string) : Buffer => {
  const pj = { name, version }
  const json = JSON.stringify(pj)
  return makeTar([{
    'path': 'package/package.json',
    size: json.length,
    type: 'File'
  }, json])
}

const makeJob = (name: string, version: string): [string, Buffer] => {
  return [`node_modules/.vlt/registry.npmjs.org/${name}/${version}/node_modules/${name}`, makePkg(name, version)]
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
for (const name of names) {
  for (const version of versions) {
    reqs.push(makeJob(name, version))
  }
}

t.test('unpack all the things!', async t => {
  const d = t.testdir()
  const results = await Promise.all(reqs.map(async ([target, tarData]) =>
    p.unpack(tarData, resolve(d, target))))
  t.strictSame(results, reqs.map(() => undefined), 'no return values')
  for (const [target] of reqs) {
    t.equal(lstatSync(resolve(d, target, 'package.json')).isFile(), true)
  }
})


t.test('response ok/error checking', t => {
  t.equal(isResponseOK({ id: 1, ok: true }), true)
  t.equal(isResponseError({ id: 1, error: 'asdf' }), true)
  t.equal(isResponseError({ id: 1, ok: true }), false)
  t.equal(isResponseOK({ id: 1, error: 'x' }), false)
  t.equal(isResponseOK({ ok: true }), false, 'id required')
  t.equal(isResponseError({ error: 'x' }), false, 'id required')
  t.end()
})
