import { error } from '@vltpkg/error-cause'
import { gzipSync } from 'node:zlib'
import type { Test } from 'tap'
import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import {
  assertOk,
  isTokenRefusal,
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

t.test('token refusal advice', t => {
  // what the edge in front of the vlt registry answers with
  const edgeExpired = JSON.stringify({
    code: 'TokenExpiredError',
    message: 'Token expired. Authenticate again to get a new token.',
  })
  // what a registry that sends no code says
  const originExpired = '{"error":"Token expired"}'
  const revoked = JSON.stringify({
    code: 'TokenRevokedError',
    message: 'Token revoked. Authenticate again to get a new token.',
  })
  const account = 'https://registry.vlt.io/acme/npm/react'

  const withEnv = (
    t: Test,
    env: Record<string, string | undefined>,
  ) => {
    const restore = { ...process.env }
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    t.teardown(() => {
      for (const key of Object.keys(process.env)) {
        if (!(key in restore)) delete process.env[key]
      }
      Object.assign(process.env, restore)
    })
  }

  t.test('names the account registry a vlt token belongs to', t => {
    withEnv(t, { VLT_TOKEN: undefined, VLT_REGISTRY: undefined })
    const setup = (gone: string) =>
      `Your token for the "acme" account ${gone}. Run \`vlt setup acme\` to ` +
      'log in again — one token covers every registry on the account.'
    t.equal(
      tokenRefusalAdvice(entry(401, edgeExpired), account),
      setup('has expired'),
    )
    // a revoked token needs the same command, and says which it was
    t.equal(
      tokenRefusalAdvice(entry(401, revoked), account),
      setup('was revoked'),
    )
    t.equal(
      tokenRefusalAdvice(
        entry(401, '{"error":"Token has been revoked"}'),
        account,
      ),
      'Your token for https://registry.vlt.io was revoked. Run ' +
        '`vlt login --registry=https://registry.vlt.io/` to log in again.',
    )
    t.end()
  })

  t.test('falls back to login against the registry', t => {
    withEnv(t, { VLT_TOKEN: undefined, VLT_REGISTRY: undefined })
    const login = (origin: string) =>
      `Your token for ${origin} has expired. Run ` +
      `\`vlt login --registry=${origin}/\` to log in again.`
    // a registry that says so in words rather than in `code`
    t.equal(
      tokenRefusalAdvice(
        entry(401, originExpired),
        'https://registry.npmjs.org/react',
      ),
      login('https://registry.npmjs.org'),
    )
    // a plain-text body saying the same thing
    t.equal(
      tokenRefusalAdvice(
        entry(401, 'Your tokens have expired'),
        'https://r.io/react',
      ),
      login('https://r.io'),
    )
    // `code` from a URL with no account/registry pair under it
    t.equal(
      tokenRefusalAdvice(
        entry(401, edgeExpired),
        'https://registry.vlt.io/-/ping',
      ),
      login('https://registry.vlt.io'),
    )
    t.end()
  })

  t.test('a VLT_REGISTRY that is not a url supplies nothing', t => {
    withEnv(t, {
      VLT_TOKEN: 'from-env',
      VLT_REGISTRY: 'not a url',
    })
    t.equal(
      tokenRefusalAdvice(entry(401, edgeExpired), account),
      'Your token for the "acme" account has expired. Run ' +
        '`vlt setup acme` to log in again — one token covers every ' +
        'registry on the account.',
    )
    t.end()
  })

  t.test('no login command replaces a token from the env', t => {
    withEnv(t, {
      VLT_TOKEN: 'from-env',
      VLT_REGISTRY: 'https://registry.vlt.io/acme/npm/',
    })
    t.equal(
      tokenRefusalAdvice(entry(401, edgeExpired), account),
      'The token for https://registry.vlt.io comes from $VLT_TOKEN, and ' +
        'it has expired. Create a new token in the vlt.io dashboard and ' +
        'set $VLT_TOKEN to it.',
    )
    t.end()
  })

  t.test('a VLT_TOKEN_* variable names itself', t => {
    withEnv(t, {
      VLT_TOKEN: undefined,
      VLT_REGISTRY: undefined,
      VLT_TOKEN_https_registry_npmjs_org: 'from-env',
    })
    t.equal(
      tokenRefusalAdvice(
        entry(401, originExpired),
        'https://registry.npmjs.org/react',
      ),
      'The token for https://registry.npmjs.org comes from ' +
        '$VLT_TOKEN_https_registry_npmjs_org, and it has expired. Create ' +
        'a new token and set $VLT_TOKEN_https_registry_npmjs_org to it.',
    )
    t.end()
  })

  t.test('anything else gets no advice', t => {
    withEnv(t, { VLT_TOKEN: undefined, VLT_REGISTRY: undefined })
    const unreadable = entry(401, Buffer.from([0x1f, 0x8b, 0x00]), [
      ['content-encoding', 'gzip'],
    ])
    for (const [label, response, url] of [
      ['not a 401', entry(403, edgeExpired), account],
      ['no body', entry(401), account],
      [
        'a rejected token',
        entry(
          401,
          '{"code":"UnauthorizedError","message":"Invalid token"}',
        ),
        account,
      ],
      [
        'a JSON body that is not an object',
        entry(401, '"expired"'),
        account,
      ],
      ['an unreadable body', unreadable, account],
      ['no url to advise about', entry(401, edgeExpired), undefined],
      [
        'a url that will not parse',
        entry(401, edgeExpired),
        'not a url',
      ],
    ] as [string, CacheEntry, string | undefined][]) {
      t.equal(tokenRefusalAdvice(response, url), undefined, label)
    }
    // a raw undici response, which carries no readable body at all
    t.equal(
      tokenRefusalAdvice({ statusCode: 401 }, account),
      undefined,
      'a response with no body to read',
    )
    // an error that never had a response on it
    t.equal(
      tokenRefusalAdvice(undefined, account),
      undefined,
      'no response at all',
    )
    t.end()
  })

  t.test('is a predicate otplease can ask before it throws', t => {
    t.equal(isTokenRefusal(entry(401, edgeExpired)), true)
    t.equal(isTokenRefusal(entry(401, originExpired)), true)
    t.equal(
      isTokenRefusal(
        entry(
          401,
          '{"code":"UnauthorizedError","message":"Invalid token"}',
        ),
      ),
      false,
    )
    t.equal(isTokenRefusal(undefined), false)
    t.end()
  })

  t.test('stands in for the advice the caller would give', t => {
    withEnv(t, { VLT_TOKEN: undefined, VLT_REGISTRY: undefined })
    t.throws(
      () =>
        assertOk(entry(401, edgeExpired), {
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
          'Authenticate again to get a new token.\n⚠️ Your token for the ' +
          '"acme" account has expired. Run `vlt setup acme` to log in again ' +
          '— one token covers every registry on the account.',
        cause: { code: 'ENEEDAUTH', status: 401 },
      },
    )
    t.end()
  })

  t.end()
})
