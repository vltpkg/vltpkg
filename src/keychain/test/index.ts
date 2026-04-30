import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'

const getKC = async (t: Test) => {
  t.intercept(process, 'platform', { value: 'linux' })
  const xdgRoot = t.testdir({
    config: {},
    cache: {},
    data: {},
    state: {},
    runtime: {},
  })
  t.intercept(process, 'env', {
    value: {
      ...process.env,
      XDG_CONFIG_HOME: resolve(xdgRoot, 'config'),
      XDG_CACHE_HOME: resolve(xdgRoot, 'cache'),
      XDG_DATA_HOME: resolve(xdgRoot, 'data'),
      XDG_STATE_HOME: resolve(xdgRoot, 'state'),
      XDG_RUNTIME_HOME: resolve(xdgRoot, 'runtime'),
    },
  })
  const { Keychain } =
    await t.mockImport<typeof import('../src/index.ts')>(
      '../src/index.ts',
    )
  // nerf the autosave because tap will tear down the folder
  return {
    Keychain: class extends Keychain {
      constructor(application: string) {
        super(application)
        t.teardown(() => (this.save = async () => {}))
      }
    },
  }
}

t.test('basic behavior', async t => {
  const { Keychain } = await getKC(t)
  const kc = new Keychain('test/basic')
  t.equal(kc.getSync('x'), undefined)
  kc.delete('x')
  t.equal(await kc.has('x'), false)
  t.equal(await kc.get('x'), undefined)
  kc.set('x', 'y')
  kc.set('a', 'b')
  t.equal(await kc.get('x'), 'y')
  t.equal(kc.getSync('x'), 'y')
  t.equal(await kc.has('z'), false)
  t.equal(await kc.has('x'), true)
  t.equal(kc.dirty, true)
  await kc.save()
  await kc.save()
  t.equal(kc.dirty, false)
  kc.delete('x')
  const kc2 = new Keychain('test/basic')
  await kc2.load()
  t.equal(kc2.getSync('a'), 'b')
  t.equal(kc.dirty, true)
  t.equal(kc.getSync('x'), undefined)
})

t.test('keys and keysSync', async t => {
  const { Keychain } = await getKC(t)
  const kc = new Keychain('test/keys')
  t.strictSame(kc.keysSync(), [])
  t.strictSame(await kc.keys(), [])
  kc.set('a', '1')
  kc.set('b', '2')
  kc.set('c', '3')
  t.strictSame(kc.keysSync(), ['a', 'b', 'c'])
  t.strictSame(await kc.keys(), ['a', 'b', 'c'])
  kc.delete('b')
  t.strictSame(kc.keysSync(), ['a', 'c'])
  t.strictSame(await kc.keys(), ['a', 'c'])
})

t.test('keys loads data if not loaded', async t => {
  const { Keychain } = await getKC(t)
  const kc = new Keychain('test/keys-load')
  kc.set('x', 'y')
  await kc.save()
  const kc2 = new Keychain('test/keys-load')
  // kc2 hasn't been loaded yet; keys() should trigger load
  const result = await kc2.keys()
  t.strictSame(result, ['x'])
})

t.test('treat borked file as just not being there', async t => {
  const { Keychain } = await getKC(t)
  const kc = new Keychain('test/bork')
  kc.set('x', 'y')
  t.equal(await kc.get('x'), 'y')
  await kc.save()
  writeFileSync(kc.file, 'not json')
  const kcbork = new Keychain('test/bork')
  t.equal(await kcbork.get('x'), undefined)
})
