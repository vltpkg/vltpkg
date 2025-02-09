import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import {
  isRedirect,
  redirect,
  type RedirectResponse,
} from '../src/redirect.ts'

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
