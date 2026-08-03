import { gzipSync } from 'node:zlib'
import { CacheEntry } from '@vltpkg/registry-client'
import t from 'tap'
import { registryErrorMessage } from '../src/registry-error-message.ts'

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

t.test('falls back to JSON without a non-empty string error', t => {
  for (const body of [
    '{"message":"try again"}',
    '{"error":{"message":"try again"}}',
    '{"error":""}',
    'null',
  ]) {
    t.equal(
      registryErrorMessage(entry(400, body)),
      `400 Bad Request — ${body}`,
    )
  }
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
