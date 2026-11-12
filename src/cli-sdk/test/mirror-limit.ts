import { error } from '@vltpkg/error-cause'
import t from 'tap'
import {
  mirrorLimitAdvice,
  mirrorLimitMessage,
} from '../src/mirror-limit.ts'

const mirror = 'https://registry.vlt.io/upstream/npm/'

// the shape undici's RetryHandler rejects with once it gives up on a 429
const retryError = (statusCode: number) =>
  Object.assign(new Error('Request failed'), {
    name: 'RequestRetryError',
    code: 'UND_ERR_REQ_RETRY',
    statusCode,
  })

// the error registry-client rethrows it as
const requestFailed = (url: string | URL, statusCode = 429) =>
  error('Request failed', {
    code: 'EREQUEST',
    url,
    method: 'GET',
    cause: retryError(statusCode),
  })

t.test('advice for a 429 from the public mirror', async t => {
  t.match(mirrorLimitMessage, /`vlt setup`/)
  t.match(mirrorLimitMessage, /registries\.npm=<url>/)
  const packument = requestFailed(new URL(`${mirror}abbrev`))
  t.equal(mirrorLimitAdvice(packument), mirrorLimitMessage, 'URL')
  t.equal(
    mirrorLimitAdvice(
      requestFailed(`${mirror}abbrev/-/abbrev-1.1.1.tgz`),
    ),
    mirrorLimitMessage,
    'tarball url string',
  )
  t.equal(
    mirrorLimitAdvice(
      Object.assign(new Error('graph run failed'), {
        code: 'GRAPHRUN_TRAVERSAL',
        cause: packument,
      }),
    ),
    mirrorLimitMessage,
    'wrapped once more',
  )
  t.equal(
    mirrorLimitAdvice(
      error('failed to resolve', {
        ...(packument.cause as object),
        from: '/p',
        cause: packument,
      }),
    ),
    mirrorLimitMessage,
    'wrapped with a copied url',
  )
  t.equal(
    mirrorLimitAdvice(
      error('failed', {
        url: `${mirror}abbrev`,
        response: { statusCode: 429 },
      }),
    ),
    mirrorLimitMessage,
    'response-shaped',
  )
  t.equal(
    mirrorLimitAdvice({ url: `${mirror}abbrev`, status: 429 }),
    mirrorLimitMessage,
    'status',
  )
})

t.test('no advice otherwise', async t => {
  t.equal(
    mirrorLimitAdvice(
      requestFailed('https://registry.npmjs.org/abbrev'),
    ),
    undefined,
    '429 at another registry',
  )
  t.equal(
    mirrorLimitAdvice(requestFailed(`${mirror}abbrev`, 503)),
    undefined,
    '503 at the mirror',
  )
  t.equal(
    mirrorLimitAdvice(
      error('failed', {
        url: `${mirror}abbrev`,
        response: { statusCode: 500 },
      }),
    ),
    undefined,
    'response without a 429',
  )
  t.equal(
    mirrorLimitAdvice(error('failed', { cause: retryError(429) })),
    undefined,
    'no url',
  )
  t.equal(
    mirrorLimitAdvice({ url: 123, statusCode: 429 }),
    undefined,
    'non-url url',
  )
  for (const v of [undefined, null, 'str', 429]) {
    t.equal(mirrorLimitAdvice(v), undefined, String(v))
  }
  const loop: Record<string, unknown> = { statusCode: 429 }
  loop.cause = loop
  t.equal(mirrorLimitAdvice(loop), undefined, 'bounded cause chain')
  t.equal(
    mirrorLimitAdvice({
      get statusCode() {
        throw new Error('nope')
      },
    }),
    undefined,
    'throwing getter',
  )
})
