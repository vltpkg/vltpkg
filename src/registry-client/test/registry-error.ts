import { gzipSync } from 'node:zlib'
import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import {
  assertOk,
  registryErrorMessage,
} from '../src/registry-error.ts'

const entry = (
  statusCode: number,
  body: string | Uint8Array = '',
  headers: [string, string][] = [],
): CacheEntry => {
  const buffer = typeof body === 'string' ? Buffer.from(body) : body
  return new CacheEntry(
    statusCode,
    headers.flatMap(([key, value]) => [
      Buffer.from(key),
      Buffer.from(value),
    ]),
    {
      body: buffer,
      contentLength: buffer.length,
    },
  )
}

t.test('extracts the error from a gzipped JSON response', t => {
  const body = gzipSync(
    JSON.stringify({ error: 'The package name is invalid' }),
  )
  const response = entry(422, body, [
    ['content-type', 'application/json'],
    ['content-encoding', 'gzip'],
  ])

  t.equal(
    registryErrorMessage(response),
    '422 Unprocessable Entity — The package name is invalid',
  )
  t.end()
})

t.test('falls back to a non-JSON response body', t => {
  t.equal(
    registryErrorMessage(entry(403, '  request forbidden  ')),
    '403 Forbidden — request forbidden',
  )
  t.end()
})

t.test('extracts npm message body shapes', t => {
  for (const body of [
    '{"error":"try again"}',
    '{"message":"try again"}',
    '{"error":{"message":"try again"}}',
    '{"message":"  try again  "}',
  ]) {
    t.equal(
      registryErrorMessage(entry(400, body)),
      '400 Bad Request — try again',
      body,
    )
  }
  t.end()
})

t.test('falls back to JSON without a usable message', t => {
  for (const body of ['{"error":""}', 'null', '[1,2,3]', '"nope"']) {
    t.equal(
      registryErrorMessage(entry(400, body)),
      `400 Bad Request — ${body}`,
    )
  }
  t.end()
})

t.test('strips tags from an HTML error page', t => {
  const body =
    '<!doctype html><html><head><style>a{color:red}</style>' +
    '<script>var x = 1</script></head><body><h1>502 Bad Gateway</h1>' +
    '<p>The upstream   server is  unreachable.</p></body></html>'
  t.equal(
    registryErrorMessage(entry(502, body)),
    '502 Bad Gateway — 502 Bad Gateway The upstream server is unreachable.',
  )
  t.end()
})

t.test('returns the bare status when HTML has no text', t => {
  t.equal(
    registryErrorMessage(entry(502, '<html><body></body></html>')),
    '502 Bad Gateway',
  )
  t.end()
})

t.test('truncates a very long detail', t => {
  const detail = 'x'.repeat(2000)
  const msg = registryErrorMessage(entry(400, detail))
  t.equal(msg, `400 Bad Request — ${'x'.repeat(511)}…`)
  t.equal(msg.length, '400 Bad Request — '.length + 512)
  t.end()
})

t.test('handles a response with no text method', t => {
  t.equal(registryErrorMessage({ statusCode: 404 }), '404 Not Found')
  t.end()
})

t.test('assertOk passes through a 2xx', t => {
  t.doesNotThrow(() =>
    assertOk(entry(200, 'ok'), {
      message: 'nope',
      url: 'https://x.com/',
    }),
  )
  // a duck-typed response with no statusCode must not throw
  t.doesNotThrow(() =>
    assertOk({} as unknown as { statusCode: number }, {
      message: 'nope',
      url: 'https://x.com/',
    }),
  )
  t.end()
})

t.test('assertOk uses ENEEDAUTH for 401 and 403', t => {
  for (const statusCode of [401, 403]) {
    t.throws(
      () =>
        assertOk(entry(statusCode, '{"error":"denied"}'), {
          message: 'Failed to do the thing',
          url: 'https://x.com/thing',
          method: 'PUT',
        }),
      {
        message: /^Failed to do the thing: \d+ .*— denied$/,
        cause: {
          code: 'ENEEDAUTH',
          method: 'PUT',
          status: statusCode,
        },
      },
    )
  }
  t.end()
})

t.test('assertOk uses EREQUEST otherwise, and appends advice', t => {
  t.throws(
    () =>
      assertOk(entry(500, 'boom'), {
        message: 'Failed to do the thing',
        url: 'https://x.com/thing',
        advice: statusCode =>
          statusCode === 500 ? 'Try again later.' : undefined,
      }),
    {
      message:
        'Failed to do the thing: 500 Internal Server Error — boom\n⚠️ Try again later.',
      cause: { code: 'EREQUEST', method: 'GET', status: 500 },
    },
  )

  // advice that returns undefined appends nothing
  t.throws(
    () =>
      assertOk(entry(404, 'gone'), {
        message: 'Failed to do the thing',
        url: 'https://x.com/thing',
        advice: () => undefined,
      }),
    { message: 'Failed to do the thing: 404 Not Found — gone' },
  )
  t.end()
})

t.test('handles empty and unreadable response bodies', t => {
  t.equal(
    registryErrorMessage(entry(500)),
    '500 Internal Server Error',
  )

  const invalidGzip = entry(502, Buffer.from([0x1f, 0x8b, 0x00]))
  t.equal(registryErrorMessage(invalidGzip), '502 Bad Gateway')
  t.end()
})

t.test('handles an unknown status code', t => {
  t.equal(
    registryErrorMessage(entry(599, 'failure')),
    '599 — failure',
  )
  t.end()
})
