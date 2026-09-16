import t from 'tap'
import type { RegistryClient } from '@vltpkg/registry-client'
import {
  batchEnabled,
  batches,
  fetchBatch,
  MAX_BATCH_SPECS,
  resetCapabilities,
  supportsBatch,
} from '../src/batch.ts'

const registry = 'https://registry.vlt.io/acme/npm/'

/** A RegistryClient stub that answers whatever the test hands it. */
const client = (
  respond: (url: URL, options: Record<string, any>) => any,
): RegistryClient =>
  ({
    request: async (url: URL, options: Record<string, any> = {}) =>
      respond(url, options),
  }) as unknown as RegistryClient

const ndjson = (lines: string[]) => ({
  statusCode: 207,
  text: () => lines.join('\n') + '\n',
})

t.beforeEach(() => resetCapabilities())

t.test('batchEnabled follows the env flag', async t => {
  t.intercept(process, 'env', { value: {} })
  t.equal(batchEnabled(), false, 'off when unset')
  t.intercept(process, 'env', { value: { VLT_BATCH_MANIFESTS: '0' } })
  t.equal(batchEnabled(), false, 'off for anything but 1')
  t.intercept(process, 'env', { value: { VLT_BATCH_MANIFESTS: '1' } })
  t.equal(batchEnabled(), true, 'on for 1')
})

t.test('batches splits at the endpoint limit', async t => {
  t.strictSame(batches([]), [], 'nothing to send')
  t.strictSame(batches(['a@1.0.0']), [['a@1.0.0']], 'one request')
  const many = Array.from(
    { length: MAX_BATCH_SPECS + 1 },
    (_, i) => `p${i}@1.0.0`,
  )
  const split = batches(many)
  t.equal(split.length, 2, 'splits past the limit')
  t.equal(split[0]?.length, MAX_BATCH_SPECS)
  t.equal(split[1]?.length, 1)
})

t.test('supportsBatch reads the capability document', async t => {
  t.test('true when it names manifests', async t => {
    const c = client(() => ({
      statusCode: 200,
      json: () => ({ manifests: '0.1' }),
    }))
    t.equal(await supportsBatch(c, registry), true)
  })

  t.test('false when the key is missing', async t => {
    const c = client(() => ({
      statusCode: 200,
      json: () => ({ resolve: '0.1' }),
    }))
    t.equal(await supportsBatch(c, registry), false)
  })

  t.test('false on a non-200', async t => {
    const c = client(() => ({ statusCode: 404, json: () => ({}) }))
    t.equal(await supportsBatch(c, registry), false)
  })

  t.test('false when the request throws', async t => {
    const c = client(() => {
      throw new Error('offline')
    })
    t.equal(await supportsBatch(c, registry), false)
  })

  t.test('asks a registry only once', async t => {
    let calls = 0
    const c = client(() => {
      calls++
      return { statusCode: 200, json: () => ({ manifests: '0.1' }) }
    })
    t.equal(await supportsBatch(c, registry), true)
    t.equal(await supportsBatch(c, registry), true)
    t.equal(calls, 1, 'memoized for the process')
  })
})

t.test('fetchBatch', async t => {
  t.test('sends the specs and keeps the 200 records', async t => {
    let sent: URL | undefined
    let body: string | undefined
    let method: string | undefined
    const c = client((url, options) => {
      sent = url
      method = options.method as string
      body = options.body as string
      return ndjson([
        JSON.stringify({
          status: 200,
          spec: 'a@1.0.0',
          manifest: { name: 'a', version: '1.0.0' },
        }),
        JSON.stringify({ status: 404, spec: 'b@9.9.9' }),
      ])
    })

    const found = await fetchBatch(c, registry, [
      'a@1.0.0',
      'b@9.9.9',
    ])
    t.equal(sent?.href, `${registry}-/vlt/manifests`)
    t.equal(
      method,
      'POST',
      'POST, since the edge cannot forward QUERY',
    )
    t.strictSame(JSON.parse(body ?? '{}'), {
      specs: ['a@1.0.0', 'b@9.9.9'],
    })
    t.strictSame(
      [...found.keys()],
      ['a@1.0.0'],
      'only the resolved one',
    )
    t.strictSame(found.get('a@1.0.0'), {
      name: 'a',
      version: '1.0.0',
    })
  })

  t.test('no request for an empty batch', async t => {
    let called = false
    const c = client(() => {
      called = true
      return ndjson([])
    })
    t.equal((await fetchBatch(c, registry, [])).size, 0)
    t.equal(called, false)
  })

  t.test('gives up on a non-207', async t => {
    const c = client(() => ({ statusCode: 500, text: () => '' }))
    t.equal((await fetchBatch(c, registry, ['a@1.0.0'])).size, 0)
  })

  t.test('gives up when the request throws', async t => {
    const c = client(() => {
      throw new Error('reset')
    })
    t.equal((await fetchBatch(c, registry, ['a@1.0.0'])).size, 0)
  })

  t.test('skips lines it cannot use', async t => {
    const c = client(() =>
      ndjson([
        'not json',
        JSON.stringify({ status: 200, spec: 'no-manifest@1.0.0' }),
        JSON.stringify({ status: 200, manifest: { name: 'x' } }),
        JSON.stringify({
          status: 200,
          spec: 'good@1.0.0',
          manifest: { name: 'good', version: '1.0.0' },
        }),
      ]),
    )
    const found = await fetchBatch(c, registry, ['good@1.0.0'])
    t.strictSame([...found.keys()], ['good@1.0.0'])
  })
})
