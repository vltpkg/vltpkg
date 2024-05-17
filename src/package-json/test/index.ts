import t from 'tap'
import { PackageJson } from '../src/index.js'

t.test('successfully reads a valid package.jsonf file', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
  })
  const pj = new PackageJson()
  t.match(
    pj.read(dir),
    { name: 'my-project', version: '1.0.0' },
    'should be able to read file and return parsed JSON',
  )
})

t.test('fails on missing package.json file', async t => {
  const dir = t.testdirName
  const pj = new PackageJson()
  t.throws(
    () => pj.read(dir),
    {
      message: 'Could not read package.json file',
      cause: {
        path: dir,
        cause: { code: 'ENOENT' },
      },
    },
    'should throw ENOENT error on missing package.json file',
  )
})

t.test('fails on malformed package.json file', async t => {
  const dir = t.testdir({
    'package.json': '{%',
  })
  const pj = new PackageJson()
  t.throws(
    () => pj.read(dir),
    {
      message: 'Invalid package.json file',
      cause: {
        path: dir,
        cause: { name: 'JSONParseError' },
      },
    },
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
  const pj = new PackageJson()
  const pkg = pj.read(dir)
  const sameDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'swapped-under-your-feet',
      version: '2.0.0',
    }),
  })

  t.strictSame(
    pj.read(sameDir),
    pkg,
    'should run any subsequent call from local in-memory cache',
  )
})
