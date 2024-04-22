import t from 'tap'
import { readPackageJson } from '../src/read-package-json.js'

t.test('successfully reads a valid package.jsonf file', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
  })
  t.strictSame(
    readPackageJson(dir),
    { name: 'my-project', version: '1.0.0' },
    'should be able to read file and return parsed JSON',
  )
})

t.test('fails on missing package.json file', async t => {
  const dir = t.testdirName
  t.throws(
    () => readPackageJson(dir),
    /ENOENT/,
    'should throw ENOENT error on missing package.json file',
  )
})

t.test('fails on malformed package.json file', async t => {
  const dir = t.testdir({
    'package.json': '{%',
  })
  t.throws(
    () => readPackageJson(dir),
    /JSON/,
    'should throw JSON parser error on malformed package.json file',
  )
})

t.test('read subsequent calls from in-memory cache', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
  })
  const packageJson = readPackageJson(dir)
  const sameDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'swapped-under-your-feet',
      version: '2.0.0',
    }),
  })

  t.strictSame(
    readPackageJson(sameDir),
    packageJson,
    'should run any subsequent call from local in-memory cache',
  )
})
