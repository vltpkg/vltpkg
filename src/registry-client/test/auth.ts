import t from 'tap'
import { isToken } from '../src/auth.js'

const checkLog = (kc: any) => (kc as Keychain).log

class Keychain {
  log: string[][] = []

  constructor(app: string) {
    t.equal(app, 'vlt/auth')
  }

  async load() {
    this.log.push(['load'])
  }

  async save() {
    this.log.push(['save'])
  }

  async delete(reg: string) {
    this.log.push(['delete', reg])
  }

  async set(reg: string, token: string) {
    t.equal(isToken(token), true)
    this.log.push(['set', reg, token])
  }

  async get(reg: string) {
    this.log.push(['get', reg])
    return 'Bearer stokenboken'
  }
}

const mocks = { '@vltpkg/keychain': { Keychain } }

t.test('isToken', t => {
  t.equal(isToken('Bearer ok'), true)
  t.equal(isToken('Basic ok'), true)
  t.equal(isToken('foobar not ok'), false)
  t.equal(isToken('bearer not ok'), false)
  t.equal(isToken('basic not ok'), false)
  t.end()
})

t.test('setToken', async t => {
  const { setToken, kc } = await t.mockImport<
    typeof import('../src/auth.js')
  >('../src/auth.js', mocks)
  await t.rejects(setToken('not a url', 'Bearer token'))
  await setToken('https://x.com/', 'Bearer token')
  t.strictSame(checkLog(kc), [
    ['set', 'https://x.com', 'Bearer token'],
  ])
  function typeChecks() {
    //@ts-expect-error
    void setToken('https://url/', 'not a token')
  }
  typeChecks
})

t.test('deleteToken', async t => {
  const { deleteToken, kc } = await t.mockImport<
    typeof import('../src/auth.js')
  >('../src/auth.js', mocks)
  await t.rejects(deleteToken('not a url'))
  await deleteToken('https://x.com/')
  t.strictSame(checkLog(kc), [
    ['load'],
    ['load'],
    ['delete', 'https://x.com'],
    ['save'],
  ])
})

t.test('getToken', async t => {
  const { getToken, kc } = await t.mockImport<
    typeof import('../src/auth.js')
  >('../src/auth.js', mocks)
  await t.rejects(getToken('not a url'))
  t.equal(await getToken('https://x.com/'), 'Bearer stokenboken')
  t.strictSame(checkLog(kc), [['get', 'https://x.com']])
  process.env.VLT_TOKEN = 'fromenv'
  process.env.VLT_REGISTRY = 'https://asdf.com/'
  t.strictSame(await getToken('https://asdf.com'), 'Bearer fromenv')
  process.env.VLT_TOKEN_https_foo_com_8080 = 'foofromenv'
  t.strictSame(
    await getToken('https://foo.com:8080/'),
    'Bearer foofromenv',
  )
})
