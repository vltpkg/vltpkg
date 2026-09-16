import t from 'tap'
import type { RegistryClient } from '@vltpkg/registry-client'
import {
  fetchResolve,
  resetResolveCapabilities,
  resolveEnabled,
  supportsResolve,
} from '../src/resolve-batch.ts'

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

const roots = [{ name: 'a', spec: '^1.0.0' }]

t.beforeEach(() => resetResolveCapabilities())

t.test('resolveEnabled follows the env flag', async t => {
  t.intercept(process, 'env', { value: {} })
  t.equal(resolveEnabled(), false, 'off when unset')
  t.intercept(process, 'env', { value: { VLT_BATCH_RESOLVE: '1' } })
  t.equal(resolveEnabled(), true, 'on for 1')
})

t.test('supportsResolve reads the capability document', async t => {
  t.test('true when it names resolve', async t => {
    const c = client(() => ({
      statusCode: 200,
      json: () => ({ manifests: '0.1', resolve: '0.1' }),
    }))
    t.equal(await supportsResolve(c, registry), true)
  })

  t.test('false when the key is missing', async t => {
    const c = client(() => ({
      statusCode: 200,
      json: () => ({ manifests: '0.1' }),
    }))
    t.equal(await supportsResolve(c, registry), false)
  })

  t.test('false on a non-200', async t => {
    const c = client(() => ({ statusCode: 404, json: () => ({}) }))
    t.equal(await supportsResolve(c, registry), false)
  })

  t.test('false when the request throws', async t => {
    const c = client(() => {
      throw new Error('offline')
    })
    t.equal(await supportsResolve(c, registry), false)
  })

  t.test('asks a registry only once', async t => {
    let calls = 0
    const c = client(() => {
      calls++
      return {
        statusCode: 200,
        json: () => ({ resolve: '0.1' }),
      }
    })
    t.equal(await supportsResolve(c, registry), true)
    t.equal(await supportsResolve(c, registry), true)
    t.equal(calls, 1, 'memoized for the process')
  })
})

t.test('fetchResolve', async t => {
  t.test(
    'sends the request and indexes 200 records both ways',
    async t => {
      let sent: URL | undefined
      let method: string | undefined
      let body: string | undefined
      const c = client((url, options) => {
        sent = url
        method = options.method as string
        body = options.body as string
        return ndjson([
          JSON.stringify({
            status: 200,
            name: 'a',
            requested: ['^1.0.0', '~1.2.0'],
            manifest: { name: 'a', version: '1.2.3' },
          }),
          JSON.stringify({ status: 404, name: 'b', spec: '>=9' }),
          JSON.stringify({
            end: true,
            status: 200,
            returned: 1,
            unresolved: 1,
          }),
        ])
      })

      const result = await fetchResolve(c, registry, { roots })
      t.equal(sent?.href, `${registry}-/vlt/resolve`)
      t.equal(
        method,
        'POST',
        'POST, since the edge cannot forward QUERY',
      )
      t.strictSame(JSON.parse(body ?? '{}'), { roots })
      t.strictSame(
        [...result.byRange.keys()],
        ['a@^1.0.0', 'a@~1.2.0'],
        'one entry per requested spec',
      )
      t.strictSame([...result.byExact.keys()], ['a@1.2.3'])
      t.strictSame(result.byRange.get('a@^1.0.0'), {
        name: 'a',
        version: '1.2.3',
      })
    },
  )

  t.test('no request for an empty root list', async t => {
    let called = false
    const c = client(() => {
      called = true
      return ndjson([])
    })
    const result = await fetchResolve(c, registry, { roots: [] })
    t.equal(result.byRange.size, 0)
    t.equal(called, false)
  })

  t.test('gives up on a non-207', async t => {
    const c = client(() => ({ statusCode: 500, text: () => '' }))
    const result = await fetchResolve(c, registry, { roots })
    t.equal(result.byRange.size, 0)
  })

  t.test('gives up when the request throws', async t => {
    const c = client(() => {
      throw new Error('reset')
    })
    const result = await fetchResolve(c, registry, { roots })
    t.equal(result.byRange.size, 0)
  })

  t.test('skips records it cannot use', async t => {
    const c = client(() =>
      ndjson([
        'not json',
        JSON.stringify({
          status: 200,
          name: 'no-requested',
          manifest: {},
        }),
        JSON.stringify({
          status: 200,
          name: 'bad-requested',
          requested: [1],
          manifest: { name: 'bad-requested', version: '1.0.0' },
        }),
        JSON.stringify({
          status: 200,
          name: 'string-mani',
          requested: ['^1'],
          manifest: 'nope',
        }),
        JSON.stringify({
          status: 200,
          name: 'wrong-name',
          requested: ['^1'],
          manifest: { name: 'other', version: '1.0.0' },
        }),
        JSON.stringify({
          status: 200,
          name: 'no-version',
          requested: ['^1'],
          manifest: { name: 'no-version' },
        }),
        JSON.stringify({
          status: 200,
          name: 'good',
          requested: ['^1'],
          manifest: { name: 'good', version: '1.0.0' },
        }),
      ]),
    )
    const result = await fetchResolve(c, registry, { roots })
    t.strictSame(
      [...result.byRange.keys()],
      ['good@^1'],
      'only the record whose manifest matches its name and has a version',
    )
  })
})
