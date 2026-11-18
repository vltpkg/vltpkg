import { X509Certificate } from 'node:crypto'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:https'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import { getCACertificates, setDefaultCACertificates } from 'node:tls'
import type { Test } from 'tap'
import t from 'tap'
import { request } from 'undici'

const fixtures = resolve(import.meta.dirname, 'fixtures/tls')
const certFile = resolve(fixtures, 'localhost-cert.pem')
const cert = readFileSync(certFile, 'utf8')
const key = readFileSync(resolve(fixtures, 'localhost-key.pem'))

const envKeys = [
  'NPM_CONFIG_CAFILE',
  'http_proxy',
  'HTTP_PROXY',
  'https_proxy',
  'HTTPS_PROXY',
]

// Swap in a copy of the environment without the CA file and proxy
// variables, so the machine running the tests can't change the result.
const setEnv = (t: Test, env: Record<string, string> = {}): void => {
  const value = { ...process.env }
  for (const key of envKeys) delete value[key]
  t.intercept(process, 'env', { value: { ...value, ...env } })
}

// The default CAs are process-wide state, so put them back after each
// test that may have replaced them.
const restoreDefaults = (t: Test): void => {
  const defaults = getCACertificates('default')
  t.teardown(() => setDefaultCACertificates(defaults))
}

// The PEM text node hands back can be wrapped differently from what
// was put in, so certificates are compared by fingerprint.
const fingerprints = (certs: string[]): string[] =>
  certs.map(c => new X509Certificate(c).fingerprint256)
const trusted = (): string[] =>
  fingerprints(getCACertificates('default'))

// An https server whose self-signed certificate is the fixture.
const createOrigin = async (t: Test): Promise<string> => {
  const server = createServer({ key, cert }, (_req, res) => {
    res.end('origin')
  })
  await new Promise<void>(res => {
    server.listen(0, '127.0.0.1', res)
  })
  t.teardown(
    () =>
      new Promise<void>(res => {
        server.close(() => res())
      }),
  )
  return `https://127.0.0.1:${(server.address() as AddressInfo).port}/`
}

// The module remembers which file it applied, so each test loads its
// own copy.
const load = async (t: Test) => ({
  ...(await t.mockImport<typeof import('../src/ca-file.ts')>(
    '../src/ca-file.ts',
  )),
  ...(await t.mockImport<typeof import('../src/proxy.ts')>(
    '../src/proxy.ts',
  )),
})

const get = async (t: Test, url: string): Promise<string> => {
  const { getDispatcher } = await load(t)
  // Verify certificates even if the environment running the tests has
  // NODE_TLS_REJECT_UNAUTHORIZED=0.
  const dispatcher = getDispatcher({
    connect: { rejectUnauthorized: true },
  })
  t.teardown(() => dispatcher.close())
  const res = await request(url, { dispatcher })
  return await res.body.text()
}

t.test(
  'defaults are untouched when the variable is unset',
  async t => {
    restoreDefaults(t)
    const before = getCACertificates('default')
    const { applyCAFile } = await load(t)
    const unset: Record<string, string>[] = [
      {},
      { NPM_CONFIG_CAFILE: '' },
    ]
    for (const env of unset) {
      setEnv(t, env)
      t.equal(applyCAFile(), undefined)
      t.strictSame(getCACertificates('default'), before)
    }
    const url = await createOrigin(t)
    await t.rejects(get(t, url), {
      code: 'DEPTH_ZERO_SELF_SIGNED_CERT',
    })
  },
)

t.test('the CA file replaces the defaults', async t => {
  restoreDefaults(t)
  setEnv(t, { NPM_CONFIG_CAFILE: certFile })
  const url = await createOrigin(t)
  t.equal(await get(t, url), 'origin')
  t.strictSame(
    trusted(),
    fingerprints([cert]),
    'only the certificate from the file is trusted',
  )
})

t.test('a bundle of several certificates is split', async t => {
  restoreDefaults(t)
  const { applyCAFile } = await load(t)
  const bundled = getCACertificates('bundled').slice(0, 3)
  const dir = t.testdir({
    'bundle.pem': [...bundled, cert].join('\n'),
  })
  setEnv(t, { NPM_CONFIG_CAFILE: resolve(dir, 'bundle.pem') })
  applyCAFile()
  t.equal(getCACertificates('default').length, 4)
})

t.test('a replaced file is applied again', async t => {
  restoreDefaults(t)
  const { applyCAFile } = await load(t)
  const [first = '', second = ''] = getCACertificates('bundled')
  const dir = t.testdir({ 'bundle.pem': first })
  const file = resolve(dir, 'bundle.pem')
  setEnv(t, { NPM_CONFIG_CAFILE: file })
  applyCAFile()
  t.strictSame(trusted(), fingerprints([first]))
  applyCAFile()
  t.strictSame(trusted(), fingerprints([first]))

  writeFileSync(file, second)
  applyCAFile()
  t.strictSame(trusted(), fingerprints([second]))

  rmSync(file)
  t.throws(() => applyCAFile(), {
    message: 'Could not read the CA file in NPM_CONFIG_CAFILE',
  })
})

t.test('a node without the setter is an error', async t => {
  const before = getCACertificates('default')
  const { applyCAFile } = await t.mockImport<
    typeof import('../src/ca-file.ts')
  >('../src/ca-file.ts', { 'node:tls': {} })
  setEnv(t)
  t.equal(
    applyCAFile(),
    undefined,
    'fine while the variable is unset',
  )
  setEnv(t, { NPM_CONFIG_CAFILE: certFile })
  t.throws(() => applyCAFile(), {
    message: 'NPM_CONFIG_CAFILE is not supported by this node',
    cause: { found: process.version, wanted: '^22.19.0 || >=24.5.0' },
  })
  t.strictSame(getCACertificates('default'), before)
})

t.test('unusable files are errors', async t => {
  restoreDefaults(t)
  const before = getCACertificates('default')
  const { applyCAFile, getDispatcher } = await load(t)
  const dir = t.testdir({ 'empty.pem': 'not a certificate\n' })

  const missing = resolve(dir, 'missing.pem')
  setEnv(t, { NPM_CONFIG_CAFILE: missing })
  t.throws(() => applyCAFile(), {
    message: 'Could not read the CA file in NPM_CONFIG_CAFILE',
    cause: { path: missing, cause: { code: 'ENOENT' } },
  })

  const empty = resolve(dir, 'empty.pem')
  setEnv(t, { NPM_CONFIG_CAFILE: empty })
  t.throws(() => getDispatcher({}), {
    message:
      'The CA file in NPM_CONFIG_CAFILE contains no PEM certificates',
    cause: { path: empty },
  })

  t.strictSame(getCACertificates('default'), before)
})
