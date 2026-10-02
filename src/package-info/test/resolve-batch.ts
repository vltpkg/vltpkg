import t from 'tap'
import { Readable } from 'node:stream'
import type { RegistryClient } from '@vltpkg/registry-client'
import { fetchResolve } from '../src/resolve-batch.ts'
import type { ResolveRecord } from '../src/resolve-batch.ts'

const registry = 'https://registry.vlt.io/acme/npm/'

/** A RegistryClient stub that answers whatever the test hands it. */
const client = (
  respond: (url: URL, options: Record<string, any>) => any,
): RegistryClient =>
  ({
    request: async (url: URL, options: Record<string, any> = {}) =>
      respond(url, options),
    requestStream: async (
      url: URL,
      options: Record<string, any> = {},
    ) => respond(url, options),
  }) as unknown as RegistryClient

const ndjson = (lines: string[]) => ({
  statusCode: 207,
  body: Readable.from([lines.join('\n') + '\n']),
})

/** Collect every record a resolve delivers. */
const collect = async (
  c: RegistryClient,
  request: Parameters<typeof fetchResolve>[2],
): Promise<ResolveRecord[]> => {
  const records: ResolveRecord[] = []
  await fetchResolve(c, registry, request, r => records.push(r))
  return records
}

/** The keys a caller would index a record under. */
const keysOf = (records: ResolveRecord[]): string[] =>
  records.flatMap(r => [
    ...r.requested.map(spec => `${r.name}@${spec}`),
    `${r.name}@${r.version}`,
  ])

const roots = [{ name: 'a', spec: '^1.0.0' }]

const record = (name: string, version: string, spec: string) =>
  JSON.stringify({
    status: 200,
    name,
    requested: [spec],
    manifest: { name, version },
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

      const records = await collect(c, { roots })
      t.equal(sent?.href, `${registry}-/vlt/resolve`)
      t.equal(
        method,
        'POST',
        'POST, since the edge cannot forward QUERY',
      )
      t.strictSame(JSON.parse(body ?? '{}'), { roots })
      t.strictSame(
        keysOf(records),
        ['a@^1.0.0', 'a@~1.2.0', 'a@1.2.3'],
        'one key per requested spec, plus the resolved version',
      )
      t.strictSame(records[0]?.manifest, {
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
    const records = await collect(c, { roots: [] })
    t.equal(records.length, 0)
    t.equal(called, false)
  })

  t.test('gives up on a non-207', async t => {
    const c = client(() => ({
      statusCode: 500,
      body: Readable.from(['']),
    }))
    t.equal((await collect(c, { roots })).length, 0)
  })

  t.test('gives up when the request throws', async t => {
    const c = client(() => {
      throw new Error('reset')
    })
    t.equal((await collect(c, { roots })).length, 0)
  })

  t.test('delivers each record as its line arrives', async t => {
    const line = (name: string) =>
      JSON.stringify({
        status: 200,
        name,
        requested: ['^1'],
        manifest: { name, version: '1.0.0' },
      }) + '\n'
    // The second line is withheld until the first record is delivered,
    // so a caller that only saw both at the end could not pass.
    let releaseSecond: () => void
    const second = new Promise<void>(res => (releaseSecond = res))
    const c = client(() => ({
      statusCode: 207,
      body: Readable.from(
        (async function* () {
          yield line('first')
          await second
          yield line('second')
        })(),
      ),
    }))

    const seen: string[] = []
    await fetchResolve(c, registry, { roots }, r => {
      seen.push(r.name)
      if (r.name === 'first') releaseSecond()
    })
    t.strictSame(seen, ['first', 'second'])
  })

  t.test('keeps the records a dying stream did carry', async t => {
    const c = client(() => ({
      statusCode: 207,
      body: Readable.from(
        (async function* () {
          yield JSON.stringify({
            status: 200,
            name: 'delivered',
            requested: ['^1'],
            manifest: { name: 'delivered', version: '1.0.0' },
          }) + '\n'
          throw new Error('connection reset')
        })(),
      ),
    }))
    const records = await collect(c, { roots })
    t.strictSame(
      records.map(r => r.name),
      ['delivered'],
      'the request settles rather than rejecting',
    )
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
    const records = await collect(c, { roots })
    t.strictSame(
      records.map(r => r.name),
      ['good'],
      'only the record whose manifest matches its name and has a version',
    )
  })
})

t.test('the abort signal', async t => {
  t.test('reaches the request', async t => {
    let seen: AbortSignal | undefined
    const c = client((_, options) => {
      seen = options.signal
      return ndjson([record('a', '1.0.0', '^1.0.0')])
    })
    const ac = new AbortController()
    await fetchResolve(c, registry, { roots }, () => {}, ac.signal)
    t.equal(seen, ac.signal)
  })

  t.test('ends the stream, keeping what arrived', async t => {
    // a body that delivers one record and then stays open until the
    // signal destroys it, the way an aborted request's body ends
    const c = client((_, options) => {
      const body = new Readable({ read() {} })
      body.push(record('a', '1.0.0', '^1.0.0') + '\n')
      ;(options.signal as AbortSignal).addEventListener('abort', () =>
        body.destroy(new Error('aborted')),
      )
      return { statusCode: 207, body }
    })
    const ac = new AbortController()
    const records: ResolveRecord[] = []
    const settled = fetchResolve(
      c,
      registry,
      { roots },
      r => {
        records.push(r)
        ac.abort()
      },
      ac.signal,
    )
    await settled
    t.strictSame(keysOf(records), ['a@^1.0.0', 'a@1.0.0'])
  })
})
