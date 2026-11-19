import { rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { rootCertificates } from 'node:tls'
import type { Test } from 'tap'
import t from 'tap'
import { caSecureContext } from '../src/ca-file.ts'

const certFile = resolve(
  import.meta.dirname,
  'fixtures/tls/localhost-cert.pem',
)

// Swap in a copy of the environment without the CA file variables, so
// the machine running the tests can't change the result.
const setEnv = (t: Test, env: Record<string, string> = {}): void => {
  const value = { ...process.env }
  delete value.npm_config_cafile
  delete value.NPM_CONFIG_CAFILE
  t.intercept(process, 'env', { value: { ...value, ...env } })
}

t.test('no context when the variable is unset', async t => {
  const unset: Record<string, string>[] = [
    {},
    { npm_config_cafile: '' },
    { NPM_CONFIG_CAFILE: '' },
  ]
  for (const env of unset) {
    setEnv(t, env)
    t.equal(caSecureContext(), undefined)
  }
})

t.test('either spelling of the variable is read', async t => {
  for (const name of ['npm_config_cafile', 'NPM_CONFIG_CAFILE']) {
    setEnv(t, { [name]: certFile })
    t.ok(caSecureContext(), name)
  }
  setEnv(t, { npm_config_cafile: '', NPM_CONFIG_CAFILE: certFile })
  t.ok(caSecureContext(), 'an empty lowercase value is skipped')
})

t.test('the lowercase variable is read first', async t => {
  const missing = resolve(t.testdir(), 'missing.pem')
  setEnv(t, {
    npm_config_cafile: missing,
    NPM_CONFIG_CAFILE: certFile,
  })
  t.throws(() => caSecureContext(), {
    message: 'Could not read the CA file in npm_config_cafile',
    cause: { found: missing },
  })
})

t.test('the file is read on every call', async t => {
  const [first = '', second = ''] = rootCertificates
  const dir = t.testdir({ 'bundle.pem': first })
  const file = resolve(dir, 'bundle.pem')
  setEnv(t, { npm_config_cafile: file })

  const context = caSecureContext()
  t.ok(context)
  t.equal(caSecureContext(), context, 'unchanged contents share it')

  writeFileSync(file, second)
  const replaced = caSecureContext()
  t.ok(replaced)
  t.not(replaced, context, 'new contents build a new context')

  rmSync(file)
  t.throws(() => caSecureContext(), {
    message: 'Could not read the CA file in npm_config_cafile',
  })
})

t.test('unusable files are config errors', async t => {
  const dir = t.testdir({ 'empty.pem': 'not a certificate\n' })

  const missing = resolve(dir, 'missing.pem')
  setEnv(t, { NPM_CONFIG_CAFILE: missing })
  t.throws(() => caSecureContext(), {
    message: 'Could not read the CA file in NPM_CONFIG_CAFILE',
    cause: {
      code: 'ECONFIG',
      found: missing,
      cause: { code: 'ENOENT' },
    },
  })

  const empty = resolve(dir, 'empty.pem')
  setEnv(t, { npm_config_cafile: empty })
  t.throws(() => caSecureContext(), {
    message:
      'The CA file in npm_config_cafile contains no PEM certificates',
    cause: { code: 'ECONFIG', found: empty },
  })
})
