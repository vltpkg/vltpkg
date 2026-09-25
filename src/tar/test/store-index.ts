import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import {
  readStoreIndex,
  storeIndexManifest,
  storeIndexPath,
} from '../src/store-index.ts'
import type { StoreIndex } from '../src/store-index.ts'

const valid: StoreIndex = {
  v: 1,
  files: [
    ['bin/cli.js', 10, 1],
    ['package.json', 20, 0],
  ],
  dirs: ['bin'],
  scripts: false,
  bins: { cli: 'bin/cli.js' },
  name: 'x',
  version: '1.0.0',
}

t.test('storeIndexPath', async t => {
  t.equal(storeIndexPath('/s/v1/abc'), '/s/v1/abc.json')
})

t.test('readStoreIndex', async t => {
  const d = t.testdir({
    'ok.json': JSON.stringify(valid),
    'min.json': JSON.stringify({
      v: 1,
      files: [],
      dirs: [],
      scripts: true,
    }),
    'bad.json': '{not json',
  })
  t.strictSame(readStoreIndex(resolve(d, 'ok')), valid)
  t.strictSame(readStoreIndex(resolve(d, 'min')), {
    v: 1,
    files: [],
    dirs: [],
    scripts: true,
  })
  t.equal(readStoreIndex(resolve(d, 'missing')), undefined)
  t.equal(readStoreIndex(resolve(d, 'bad')), undefined)
})

t.test('malformed index is a miss', async t => {
  const d = t.testdir()
  const cases: [string, unknown][] = [
    ['null', null],
    ['array', []],
    ['string', 'x'],
    ['v2', { ...valid, v: 2 }],
    ['scripts', { ...valid, scripts: 'yes' }],
    ['name', { ...valid, name: 1 }],
    ['version', { ...valid, version: 1 }],
    ['bins array', { ...valid, bins: ['x'] }],
    ['bins value', { ...valid, bins: { x: 1 } }],
    ['dirs', { ...valid, dirs: 'bin' }],
    ['files', { ...valid, files: {} }],
    ['file not array', { ...valid, files: ['a'] }],
    ['file length', { ...valid, files: [['a', 1]] }],
    ['file size', { ...valid, files: [['a', '1', 0]] }],
    ['file exec', { ...valid, files: [['a', 1, 2]] }],
    ['file path type', { ...valid, files: [[1, 1, 0]] }],
  ]
  for (const p of [
    '',
    '.',
    '..',
    '/abs',
    'a/../b',
    'a/./b',
    'a//b',
    'a/',
    '../x',
    'a\\b',
    '..\\x',
  ]) {
    cases.push([`file path ${p}`, { ...valid, files: [[p, 1, 0]] }])
    cases.push([`dir path ${p}`, { ...valid, dirs: [p] }])
  }
  for (const [name, index] of cases) {
    writeFileSync(resolve(d, 'x.json'), JSON.stringify(index))
    t.equal(readStoreIndex(resolve(d, 'x')), undefined, name)
  }
  // odd but safe names are fine
  writeFileSync(
    resolve(d, 'x.json'),
    JSON.stringify({
      ...valid,
      files: [
        ['...', 1, 0],
        ['.a/..b/c.', 1, 0],
      ],
    }),
  )
  t.ok(readStoreIndex(resolve(d, 'x')))
})

t.test('storeIndexManifest', async t => {
  const pj = (o: unknown) => Buffer.from(JSON.stringify(o))

  t.strictSame(storeIndexManifest(pj({}), false), { scripts: false })
  t.strictSame(
    storeIndexManifest(pj({ name: 'a', version: '1.2.3' }), false),
    { scripts: false, name: 'a', version: '1.2.3' },
  )
  for (const s of ['install', 'preinstall', 'postinstall']) {
    t.equal(
      storeIndexManifest(pj({ scripts: { [s]: 'x' } }), false)
        .scripts,
      true,
      s,
    )
  }
  t.equal(
    storeIndexManifest(
      pj({ scripts: { prepare: 'x', test: 'y' } }),
      false,
    ).scripts,
    false,
    'other scripts do not count',
  )
  t.equal(
    storeIndexManifest(pj({ scripts: 'install' }), false).scripts,
    false,
    'non-object scripts',
  )
  t.equal(
    storeIndexManifest(pj({}), true).scripts,
    true,
    'binding.gyp',
  )

  t.strictSame(
    storeIndexManifest(pj({ name: '@s/p', bin: './cli.js' }), false)
      .bins,
    { p: 'cli.js' },
    'string bin, scoped name',
  )
  t.strictSame(
    storeIndexManifest(
      pj({
        name: 'p',
        bin: { a: 'bin/a.js', b: '../../b.js', c: 1 },
      }),
      false,
    ).bins,
    { a: 'bin/a.js', b: 'b.js' },
    'bins normalized like reify does',
  )
  t.equal(
    storeIndexManifest(pj({ bin: 'cli.js' }), false).bins,
    undefined,
    'string bin needs a name',
  )
  t.equal(
    storeIndexManifest(pj({ name: 1, version: 2, bin: 'x' }), false)
      .bins,
    undefined,
    'non-string name',
  )
  t.equal(
    storeIndexManifest(pj({ name: 'p', bin: {} }), false).bins,
    undefined,
    'empty bin',
  )

  t.strictSame(
    storeIndexManifest(
      Buffer.from('\uFEFF' + JSON.stringify({ name: 'bom' })),
      false,
    ),
    { scripts: false, name: 'bom' },
    'leading BOM',
  )
  t.throws(() => storeIndexManifest(Buffer.from('{nope'), false), {
    message: 'invalid package.json in tarball',
    cause: { cause: { name: 'SyntaxError' } },
  })
  t.throws(() => storeIndexManifest(pj([]), false), {
    message: 'invalid package.json in tarball',
    cause: { found: [] },
  })
})
