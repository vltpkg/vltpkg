import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import { isRedirect, redirect } from '../src/redirect.ts'
import type { RedirectResponse } from '../src/redirect.ts'
import type { RegistryClientRequestOptions } from '../src/index.ts'

t.compareOptions = { includeGetters: true }

t.test('isRedirect', t => {
  t.equal(
    isRedirect(
      new CacheEntry(301, [
        Buffer.from('location'),
        Buffer.from('somewhere'),
      ]),
    ),
    true,
  )
  t.equal(isRedirect(new CacheEntry(308, [])), false)
  t.equal(
    isRedirect(
      new CacheEntry(200, [
        Buffer.from('location'),
        Buffer.from('somewhere'),
      ]),
    ),
    false,
  )

  t.end()
})

t.test('redirect', t => {
  t.throws(
    () =>
      redirect(
        {
          maxRedirections: 3,
          redirections: new Set([
            'https://example.com/a',
            'https://example.com/b',
            'https://example.com/c',
          ]),
        },
        new CacheEntry(301, [
          Buffer.from('location'),
          Buffer.from('/x'),
        ]) as RedirectResponse,
        new URL('https://example.com/c'),
      ),
    {
      message: 'Maximum redirections exceeded',
      cause: {
        max: 3,
        url: URL,
        found: [
          'https://example.com/a',
          'https://example.com/b',
          'https://example.com/c',
        ],
      },
    },
  )
  t.throws(
    () =>
      redirect(
        {
          maxRedirections: 30,
          redirections: new Set([
            'https://example.com/a',
            'https://example.com/b',
            'https://example.com/c',
          ]),
        },
        new CacheEntry(301, [
          Buffer.from('location'),
          Buffer.from('/a'),
        ]) as RedirectResponse,
        new URL('https://example.com/c'),
      ),
    {
      message: 'Redirection cycle detected',
      cause: {
        max: 30,
        url: URL,
        found: [
          'https://example.com/a',
          'https://example.com/b',
          'https://example.com/c',
        ],
      },
    },
  )

  t.matchSnapshot(
    redirect(
      {
        maxRedirections: 30,
        redirections: new Set([
          'https://example.com/a',
          'https://example.com/b',
          'https://example.com/c',
        ]),
      },
      new CacheEntry(308, [
        Buffer.from('location'),
        Buffer.from('/x'),
      ]) as RedirectResponse,
      new URL('https://example.com/c'),
    ),
    'return redirect settings',
  )

  t.matchSnapshot(
    redirect(
      {
        method: 'POST',
        body: 'hello',
        maxRedirections: 30,
        redirections: new Set([
          'https://example.com/a',
          'https://example.com/b',
          'https://example.com/c',
        ]),
      },
      new CacheEntry(303, [
        Buffer.from('location'),
        Buffer.from('/x'),
      ]) as RedirectResponse,
      new URL('https://example.com/c'),
    ),
    '303, strip body and make it a GET',
  )

  t.matchSnapshot(
    redirect(
      {
        method: 'POST',
        body: 'hello',
        maxRedirections: 0,
      },
      new CacheEntry(303, [
        Buffer.from('location'),
        Buffer.from('/x'),
      ]) as RedirectResponse,
      new URL('https://example.com/c'),
    ),
    'no redirections, just return []',
  )

  t.end()
})

t.test('authorization', t => {
  const auth = 'Bearer tok'
  const follow = (
    headers: RegistryClientRequestOptions['headers'],
    location: string,
    from = 'https://example.com/a',
  ) =>
    redirect(
      { headers },
      new CacheEntry(307, [
        Buffer.from('location'),
        Buffer.from(location),
      ]) as RedirectResponse,
      new URL(from),
    )[1]?.headers

  t.strictSame(
    follow({ authorization: auth, x: 'y' }, '/b'),
    { authorization: auth, x: 'y' },
    'kept on same origin',
  )
  t.strictSame(
    follow(['authorization', auth, 'x', 'y'], '/b'),
    ['authorization', auth, 'x', 'y'],
    'kept on same origin, array',
  )
  t.strictSame(
    follow(
      { authorization: auth, x: 'y' },
      'https://other.example.com/b',
    ),
    { x: 'y' },
    'stripped on host change',
  )
  t.strictSame(
    follow({ authorization: auth }, 'http://example.com/b'),
    {},
    'stripped on https -> http',
  )
  t.strictSame(
    follow({ authorization: auth }, 'https://example.com:8443/b'),
    {},
    'stripped on port change',
  )
  t.strictSame(
    follow(
      { Authorization: auth, authorization: auth, x: 'y' },
      'https://other.example.com/b',
    ),
    { x: 'y' },
    'stripped in any casing',
  )
  t.strictSame(
    follow(
      ['authorization', auth, 'x', 'y', 'Authorization', auth],
      'https://other.example.com/b',
    ),
    ['x', 'y'],
    'every entry stripped, flat array',
  )
  t.strictSame(
    follow(
      [
        ['authorization', auth],
        ['x', 'y'],
        ['Authorization', auth],
      ],
      'https://other.example.com/b',
    ),
    [['x', 'y']],
    'every entry stripped, pairs',
  )
  t.strictSame(
    follow(undefined, 'https://other.example.com/b'),
    {},
    'no headers',
  )

  t.end()
})
