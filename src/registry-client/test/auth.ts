import t from 'tap'
import { isToken, normalizeRegistryKey } from '../src/auth.ts'

const checkLog = (kc: any) => (kc as Keychain).log

let expectKeychainApp = 'vlt/auth'
class Keychain {
  log: string[][] = []
  file: string
  #data: Record<string, string> = {}

  constructor(app: string) {
    t.equal(app, expectKeychainApp)
    this.file = app + '/keychain.json'
  }

  async load() {
    this.log.push(['load'])
  }

  async save() {
    this.log.push(['save'])
  }

  async delete(reg: string) {
    this.log.push(['delete', reg])
    delete this.#data[reg]
  }

  async set(reg: string, token: string) {
    t.equal(isToken(token), true)
    this.log.push(['set', reg, token])
    this.#data[reg] = token
  }

  async get(reg: string) {
    this.log.push(['get', reg])
    if (reg in this.#data) {
      return this.#data[reg] as `Bearer ${string}`
    }
    return 'Bearer stokenboken' as const
  }

  async keys() {
    return Object.keys(this.#data)
  }

  keysSync() {
    return Object.keys(this.#data)
  }
}

const mocks = { '@vltpkg/keychain': { Keychain } }

t.test('normalizeRegistryKey', t => {
  // Origin-only URLs (backward compat)
  t.equal(
    normalizeRegistryKey('https://registry.npmjs.org/'),
    'https://registry.npmjs.org',
  )
  t.equal(
    normalizeRegistryKey('https://registry.npmjs.org'),
    'https://registry.npmjs.org',
  )
  // Path-scoped registries
  t.equal(
    normalizeRegistryKey('https://registry.vlt.io/luke/'),
    'https://registry.vlt.io/luke',
  )
  t.equal(
    normalizeRegistryKey('https://registry.vlt.io/luke'),
    'https://registry.vlt.io/luke',
  )
  // Multiple trailing slashes
  t.equal(
    normalizeRegistryKey('https://r.io/path///'),
    'https://r.io/path',
  )
  // Port preserved
  t.equal(
    normalizeRegistryKey('https://foo.com:8080/'),
    'https://foo.com:8080',
  )
  // Throws on invalid URL
  t.throws(() => normalizeRegistryKey('not a url'))
  t.end()
})

t.test('isToken', t => {
  t.equal(isToken('Bearer ok'), true)
  t.equal(isToken('Basic ok'), true)
  t.equal(isToken('foobar not ok'), false)
  t.equal(isToken('bearer not ok'), false)
  t.equal(isToken('basic not ok'), false)
  t.end()
})

t.test('setToken', async t => {
  const { setToken, getKC } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  await t.rejects(setToken('not a url', 'Bearer token', ''))
  await setToken('https://x.com/', 'Bearer token', '')
  t.strictSame(checkLog(getKC('')), [
    ['set', 'https://x.com', 'Bearer token'],
  ])
  function typeChecks() {
    //@ts-expect-error
    void setToken('https://url/', 'not a token')
  }
  typeChecks
})

t.test('setToken preserves path', async t => {
  const { setToken, getKC } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  await setToken(
    'https://registry.vlt.io/luke/',
    'Bearer luketoken',
    '',
  )
  t.strictSame(checkLog(getKC('')), [
    ['set', 'https://registry.vlt.io/luke', 'Bearer luketoken'],
  ])
})

t.test('deleteToken', async t => {
  const { deleteToken, getKC } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  await t.rejects(deleteToken('not a url', ''))
  await deleteToken('https://x.com/', '')
  t.strictSame(checkLog(getKC('')), [
    ['load'],
    ['load'],
    ['delete', 'https://x.com'],
    ['save'],
  ])
})

t.test('deleteToken preserves path', async t => {
  const { deleteToken, getKC } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  await deleteToken('https://registry.vlt.io/luke/', '')
  t.strictSame(checkLog(getKC('')), [
    ['load'],
    ['delete', 'https://registry.vlt.io/luke'],
    ['save'],
  ])
})

t.test('getToken', async t => {
  const { getToken, getKC } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  await t.rejects(getToken('not a url', ''))
  t.equal(await getToken('https://x.com/', ''), 'Bearer stokenboken')
  t.strictSame(checkLog(getKC('')), [['get', 'https://x.com']])
  process.env.VLT_TOKEN = 'fromenv'
  process.env.VLT_REGISTRY = 'https://asdf.com/'
  t.strictSame(
    await getToken('https://asdf.com', ''),
    'Bearer fromenv',
  )
  process.env.VLT_TOKEN_https_foo_com_8080 = 'foofromenv'
  t.strictSame(
    await getToken('https://foo.com:8080/', ''),
    'Bearer foofromenv',
  )
})

t.test('getToken with path-scoped registry', async t => {
  const { getToken } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  process.env.VLT_TOKEN = 'luketoken'
  process.env.VLT_REGISTRY = 'https://registry.vlt.io/luke/'
  t.equal(
    await getToken('https://registry.vlt.io/luke/', ''),
    'Bearer luketoken',
  )
  // Trailing slash normalization
  t.equal(
    await getToken('https://registry.vlt.io/luke', ''),
    'Bearer luketoken',
  )
})

t.test('runtime tokens take precedence', async t => {
  const {
    getToken,
    setRuntimeToken,
    clearRuntimeTokens,
    runtimeTokens,
  } = await t.mockImport<typeof import('../src/auth.ts')>(
    '../src/auth.ts',
    mocks,
  )
  t.equal(runtimeTokens.size, 0)
  setRuntimeToken('https://x.com/', 'Bearer oidc-token')
  t.equal(runtimeTokens.size, 1)
  t.equal(await getToken('https://x.com/', ''), 'Bearer oidc-token')
  // env vars should be ignored when runtime token is set
  process.env.VLT_TOKEN = 'fromenv'
  process.env.VLT_REGISTRY = 'https://x.com/'
  t.equal(await getToken('https://x.com/', ''), 'Bearer oidc-token')
  clearRuntimeTokens()
  t.equal(runtimeTokens.size, 0)
  // now falls back to env
  t.equal(await getToken('https://x.com/', ''), 'Bearer fromenv')
})

t.test(
  'runtime tokens for path-scoped registries are independent',
  async t => {
    const {
      getToken,
      setRuntimeToken,
      clearRuntimeTokens,
      runtimeTokens,
    } = await t.mockImport<typeof import('../src/auth.ts')>(
      '../src/auth.ts',
      mocks,
    )
    setRuntimeToken(
      'https://registry.vlt.io/luke/',
      'Bearer luke-oidc',
    )
    setRuntimeToken('https://registry.vlt.io/vlt/', 'Bearer vlt-oidc')
    t.equal(runtimeTokens.size, 2)
    t.equal(
      await getToken('https://registry.vlt.io/luke/', ''),
      'Bearer luke-oidc',
    )
    t.equal(
      await getToken('https://registry.vlt.io/vlt/', ''),
      'Bearer vlt-oidc',
    )
    clearRuntimeTokens()
  },
)

t.test('getTokenByURL longest-prefix match', async t => {
  const { getTokenByURL, setRuntimeToken, clearRuntimeTokens } =
    await t.mockImport<typeof import('../src/auth.ts')>(
      '../src/auth.ts',
      mocks,
    )
  setRuntimeToken(
    'https://registry.vlt.io/luke/',
    'Bearer luke-token',
  )
  setRuntimeToken('https://registry.vlt.io/vlt/', 'Bearer vlt-token')

  // Request URL under /luke/ → luke-token
  t.equal(
    await getTokenByURL(
      'https://registry.vlt.io/luke/@scope/pkg',
      '',
    ),
    'Bearer luke-token',
  )
  // Request URL under /vlt/ → vlt-token
  t.equal(
    await getTokenByURL('https://registry.vlt.io/vlt/@scope/pkg', ''),
    'Bearer vlt-token',
  )
  clearRuntimeTokens()
})

t.test('getTokenByURL exact match', async t => {
  const { getTokenByURL, setRuntimeToken, clearRuntimeTokens } =
    await t.mockImport<typeof import('../src/auth.ts')>(
      '../src/auth.ts',
      mocks,
    )
  setRuntimeToken('https://registry.npmjs.org/', 'Bearer npm-token')
  t.equal(
    await getTokenByURL('https://registry.npmjs.org/', ''),
    'Bearer npm-token',
  )
  t.equal(
    await getTokenByURL('https://registry.npmjs.org/pkg', ''),
    'Bearer npm-token',
  )
  clearRuntimeTokens()
})

t.test('getTokenByURL falls back to getToken', async t => {
  const { getTokenByURL } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  // No runtime tokens or keychain entries; falls through to getToken
  // which uses the mock keychain's get() returning 'Bearer stokenboken'
  t.equal(
    await getTokenByURL('https://unknown.com/foo', ''),
    'Bearer stokenboken',
  )
})

t.test('getTokenByURL prefers env registry with path', async t => {
  const { getTokenByURL, clearRuntimeTokens } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  clearRuntimeTokens()
  process.env.VLT_TOKEN = 'env-path-token'
  process.env.VLT_REGISTRY = 'https://registry.vlt.io/luke/'
  t.equal(
    await getTokenByURL(
      'https://registry.vlt.io/luke/@scope/pkg',
      '',
    ),
    'Bearer env-path-token',
  )
})

t.test(
  'getTokenByURL with keychain entries does prefix match',
  async t => {
    const { getTokenByURL, setToken, clearRuntimeTokens } =
      await t.mockImport<typeof import('../src/auth.ts')>(
        '../src/auth.ts',
        mocks,
      )
    clearRuntimeTokens()
    delete process.env.VLT_TOKEN
    delete process.env.VLT_REGISTRY
    // Store tokens in keychain via setToken
    await setToken(
      'https://registry.vlt.io/luke/',
      'Bearer kc-luke',
      '',
    )
    await setToken(
      'https://registry.vlt.io/vlt/',
      'Bearer kc-vlt',
      '',
    )

    t.equal(
      await getTokenByURL(
        'https://registry.vlt.io/luke/@scope/pkg',
        '',
      ),
      'Bearer kc-luke',
    )
    t.equal(
      await getTokenByURL(
        'https://registry.vlt.io/vlt/@scope/pkg',
        '',
      ),
      'Bearer kc-vlt',
    )
  },
)

t.test('get a KC with a different identity', async t => {
  const { getKC } = await t.mockImport<
    typeof import('../src/auth.ts')
  >('../src/auth.ts', mocks)
  expectKeychainApp = 'vlt/auth/politics'
  const kc = getKC('politics')
  t.equal(kc.file, 'vlt/auth/politics/keychain.json')
  t.end()
})
