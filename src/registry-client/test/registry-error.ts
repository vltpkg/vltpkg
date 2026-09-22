import { error } from '@vltpkg/error-cause'
import { gzipSync } from 'node:zlib'
import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import {
  assertOk,
  tokenRefusal,
  tokenRefusalAdvice,
  registryErrorMessage,
  requestError,
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

t.test('assertOk renders each advice entry on its own line', t => {
  t.throws(
    () =>
      assertOk(entry(500, 'boom'), {
        message: 'Failed',
        url: 'https://x.com/',
        advice: () => ['first thing', undefined, 'second thing'],
      }),
    {
      message:
        'Failed: 500 Internal Server Error — boom\n' +
        '⚠️ first thing\n⚠️ second thing',
    },
  )
  t.end()
})

t.test('requestError', t => {
  const url = new URL('https://x.com/thing')

  t.test('the thrown reason is the detail of a status error', t => {
    // otplease throws rather than returning, but still carries the
    // response that provoked it -- a raw undici response, no text()
    const thrown = error('Missing or invalid authentication token.', {
      code: 'ENEEDAUTH',
      status: 401,
      response: { statusCode: 401, headers: {} },
    })
    const e = requestError(thrown, {
      message: 'Failed to publish package',
      url,
      method: 'PUT',
    })
    t.equal(
      e.message,
      'Failed to publish package: 401 Unauthorized — ' +
        'Missing or invalid authentication token.',
    )
    t.match(e, {
      cause: {
        code: 'ENEEDAUTH',
        method: 'PUT',
        status: 401,
        cause: thrown,
      },
    })
    t.end()
  })

  t.test('takes the status off the response when absent', t => {
    const thrown = error('nope', { response: { statusCode: 503 } })
    const e = requestError(thrown, { message: 'Failed', url })
    t.equal(e.message, 'Failed: 503 Service Unavailable — nope')
    t.match(e, { cause: { code: 'EREQUEST', status: 503 } })
    t.end()
  })

  t.test("caller's advice is added, never substituted", t => {
    const thrown = error('nope', { response: { statusCode: 403 } })
    const e = requestError(thrown, {
      message: 'Failed',
      url,
      advice: statusCode =>
        statusCode === 403 ? 'do the other thing' : undefined,
    })
    t.equal(
      e.message,
      'Failed: 403 Forbidden — nope\n⚠️ do the other thing',
    )
    // advice that declines leaves just the reason
    const e2 = requestError(thrown, {
      message: 'Failed',
      url,
      advice: () => undefined,
    })
    t.equal(e2.message, 'Failed: 403 Forbidden — nope')
    t.end()
  })

  t.test(
    'a readable body is the detail; the reason becomes a tip',
    t => {
      const thrown = error('Missing token.', {
        response: {
          statusCode: 401,
          text: () => '{"error":"token rejected"}',
        },
      })
      const e = requestError(thrown, { message: 'Failed', url })
      t.equal(
        e.message,
        'Failed: 401 Unauthorized — token rejected\n⚠️ Missing token.',
      )
      // with caller advice too, nothing is lost: reason first, then tip
      const e2 = requestError(thrown, {
        message: 'Failed',
        url,
        advice: () => 'Run `vlt login`.',
      })
      t.equal(
        e2.message,
        'Failed: 401 Unauthorized — token rejected\n' +
          '⚠️ Missing token.\n⚠️ Run `vlt login`.',
      )
      t.end()
    },
  )

  t.test('an unreadable body counts as no body', t => {
    const thrown = error('nope', {
      response: {
        statusCode: 401,
        text: () => {
          throw new Error('bad gzip')
        },
      },
    })
    const e = requestError(thrown, { message: 'Failed', url })
    t.equal(e.message, 'Failed: 401 Unauthorized — nope')
    t.end()
  })

  t.test('a transport failure names its cause and keeps it', t => {
    const syscall = Object.assign(
      new Error('connect ECONNREFUSED 127.0.0.1:1'),
      { code: 'ECONNREFUSED', syscall: 'connect' },
    )
    const thrown = error('Request failed', {
      code: 'EREQUEST',
      cause: syscall,
    })
    const e = requestError(thrown, {
      message: 'Failed to publish package',
      url,
      method: 'PUT',
    })
    t.equal(
      e.message,
      'Failed to publish package: Request failed: ' +
        'connect ECONNREFUSED 127.0.0.1:1',
    )
    // printErr reads cause.cause for Code/Syscall
    t.match(e, {
      cause: { code: 'EREQUEST', method: 'PUT', cause: syscall },
    })
    t.end()
  })

  t.test('an inner cause repeating the message is not doubled', t => {
    const thrown = error('boom', { cause: new Error('boom') })
    const e = requestError(thrown, { message: 'Failed', url })
    t.equal(e.message, 'Failed: boom')
    t.end()
  })

  t.test('a bare error with no cause bag', t => {
    const e = requestError(new Error('kaboom'), {
      message: 'Failed',
      url,
    })
    t.equal(e.message, 'Failed: kaboom')
    t.match(e, { cause: { code: 'EREQUEST', method: 'GET' } })
    t.end()
  })

  t.end()
})

t.test('token refusal', t => {
  const expired = JSON.stringify({
    code: 'TokenExpiredError',
    message: 'Token expired. Authenticate again to get a new token.',
  })
  const revoked =
    '{"code":"TokenRevokedError","message":"Token revoked."}'
  const account = 'https://registry.vlt.io/acme/npm/react'
  const setup = (gone: string) =>
    `Your token for the "acme" account ${gone}. Run \`vlt setup acme\` to ` +
    'log in again — one token covers every registry on the account.'

  t.test('reads the condition out of the code', t => {
    t.equal(tokenRefusal(entry(401, expired)), 'expired')
    t.equal(tokenRefusal(entry(401, revoked)), 'revoked')
    const unreadable = entry(401, Buffer.from([0x1f, 0x8b, 0x00]), [
      ['content-encoding', 'gzip'],
    ])
    for (const [label, response] of [
      ['not a 401', entry(403, expired)],
      ['no body', entry(401)],
      ['not json', entry(401, 'token expired')],
      ['another code', entry(401, '{"code":"UnauthorizedError"}')],
      ['a code that is not a string', entry(401, '{"code":1}')],
      ['an unreadable body', unreadable],
      ['no body to read at all', { statusCode: 401 }],
      ['not a response', undefined],
    ] as [string, unknown][]) {
      t.equal(tokenRefusal(response), undefined, label)
    }
    t.end()
  })

  t.test('advises re-authenticating the account', t => {
    t.equal(
      tokenRefusalAdvice(entry(401, expired), account),
      setup('has expired'),
    )
    t.equal(
      tokenRefusalAdvice(entry(401, revoked), account),
      setup('was revoked'),
    )
    for (const [label, response, url] of [
      [
        'a rejected token',
        entry(401, '{"code":"UnauthorizedError"}'),
        account,
      ],
      ['no url', entry(401, expired), undefined],
      ['a url that will not parse', entry(401, expired), 'not a url'],
      [
        'no account in the path',
        entry(401, expired),
        'https://registry.vlt.io/',
      ],
      [
        'a path that is not an account',
        entry(401, expired),
        'https://registry.vlt.io/-/ping',
      ],
    ] as [string, unknown, string | undefined][]) {
      t.equal(tokenRefusalAdvice(response, url), undefined, label)
    }
    t.end()
  })

  t.test('stands in for the advice the caller would give', t => {
    t.throws(
      () =>
        assertOk(entry(401, expired), {
          message: 'Failed to publish package',
          url: account,
          advice: statusCode =>
            statusCode === 401 ?
              'Not logged in. Run `vlt login` and try again.'
            : undefined,
        }),
      {
        message:
          'Failed to publish package: 401 Unauthorized — Token expired. ' +
          `Authenticate again to get a new token.\n⚠️ ${setup('has expired')}`,
        cause: { code: 'ENEEDAUTH', status: 401 },
      },
    )
    t.end()
  })

  t.end()
})
