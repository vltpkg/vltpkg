// Checks the agent-facing endpoints of a running docs site:
//   node scripts/check-agent-endpoints.mts [origin]   (default http://localhost:3000)
import assert from 'node:assert/strict'
import { test } from 'node:test'

const origin = process.argv[2] ?? 'http://localhost:3000'

const get = (path: string, accept = '*/*') =>
  fetch(new URL(path, origin), { headers: { Accept: accept } })

const type = (res: Response) => res.headers.get('content-type') ?? ''
const varies = (res: Response) =>
  (res.headers.get('vary') ?? '')
    .toLowerCase()
    .split(/,\s*/)
    .includes('accept')

// what agents send in practice: markdown preferred, anything accepted
const agent = 'text/markdown, text/html;q=0.9, */*;q=0.8'

for (const path of ['/', '/client/auth']) {
  void test(`${path} negotiates markdown`, async () => {
    const md = await get(path, 'text/markdown')
    assert.equal(md.status, 200)
    assert.match(type(md), /^text\/markdown/)
    assert.ok(varies(md), 'markdown response has Vary: Accept')
    assert.match(await md.text(), /^# \S/)

    const html = await get(path, 'text/html')
    assert.equal(html.status, 200)
    assert.match(type(html), /^text\/html/)
    assert.match(await html.text(), /<html/i)
  })
}

for (const path of ['/no-such-page', '/no-such-page.md']) {
  void test(`${path} is a markdown 404`, async () => {
    const res = await get(path, 'text/markdown')
    assert.equal(res.status, 404)
    assert.match(type(res), /^text\/markdown/)
    const body = await res.text()
    assert.ok(body.length >= 20)
    assert.match(body, /\/llms\.txt\)/)
  })
}

void test('files keep their own type when markdown is preferred', async () => {
  for (const [path, expected] of [
    ['/llms.txt', /^text\/plain/],
    ['/llms-full.txt', /^text\/plain/],
    ['/sitemap.xml', /xml/],
    ['/openapi.json', /^application\/json/],
  ] as const) {
    const res = await get(path, agent)
    assert.equal(res.status, 200, path)
    assert.match(type(res), expected, path)
  }
})

void test('/openapi.json describes endpoints that exist', async () => {
  const spec = (await (await get('/openapi.json')).json()) as {
    openapi: string
    info: { title: string; version: string }
    paths: Record<string, unknown>
  }
  assert.match(spec.openapi, /^3\.1\.\d+$/)
  assert.ok(spec.info.title && spec.info.version)
  for (const path of Object.keys(spec.paths)) {
    const res = await get(
      path.replace('{path}', 'client/auth') +
        (path.endsWith('/search') ? '?query=install' : ''),
    )
    assert.equal(res.status, 200, path)
  }
})

void test('/api/v1/search returns json results', async () => {
  const res = await get('/api/v1/search?query=install')
  assert.match(type(res), /^application\/json/)
  const results = (await res.json()) as {
    url: string
    type: string
  }[]
  assert.ok(results.length > 0)
  assert.equal(results[0]?.type, 'page')
})

void test('unknown /api paths are json 404s', async () => {
  for (const method of ['GET', 'POST']) {
    const res = await fetch(
      new URL('/api/no-such-endpoint', origin),
      {
        method,
      },
    )
    assert.equal(res.status, 404)
    assert.match(type(res), /^application\/json/)
    const { error } = (await res.json()) as {
      error: { code: string; message: string; hint: string }
    }
    assert.equal(error.code, 'not_found')
    assert.ok(error.message && error.hint)
  }
})

void test('/ has Organization and SoftwareApplication JSON-LD', async () => {
  const html = await (await get('/', 'text/html')).text()
  const script =
    /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(
      html,
    )?.[1]
  assert.ok(script, 'json-ld script on the homepage')
  const ld = JSON.parse(script) as {
    '@context': string
    '@graph': { '@type': string; contactPoint?: { email?: string } }[]
  }
  assert.equal(ld['@context'], 'https://schema.org')
  const types = ld['@graph'].map(node => node['@type'])
  assert.deepEqual(types, [
    'Organization',
    'WebSite',
    'SoftwareApplication',
  ])
  assert.ok(ld['@graph'][0]?.contactPoint?.email)
})

void test('/api/search is a deprecated alias of /api/v1/search', async () => {
  const res = await get('/api/search?query=install')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('deprecation') ?? '', /^@\d+$/)
  assert.match(
    res.headers.get('link') ?? '',
    /<\/api\/v1\/search>; rel="successor-version"/,
  )
})

void test('/llms.txt links the OpenAPI spec', async () => {
  assert.match(
    await (await get('/llms.txt')).text(),
    /\/openapi\.json\)/,
  )
})
