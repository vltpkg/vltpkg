import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'

t.test('createGetAuthHeader', async t => {
  const calls: [string, string][] = []
  const { createGetAuthHeader } = await t.mockImport<
    typeof import('../src/query-auth.ts')
  >('../src/query-auth.ts', {
    '@vltpkg/registry-client': {
      getTokenByURL: async (url: string, identity: string) => {
        calls.push([url, identity])
        return url.startsWith('http://example.com/private/') ?
            'Bearer test-token'
          : undefined
      },
    },
  })

  const conf = {
    options: { identity: 'myid' },
  } as unknown as LoadedConfig
  const getAuthHeader = createGetAuthHeader(conf)

  t.equal(
    await getAuthHeader('http://example.com/private/registry/a'),
    'Bearer test-token',
    'should return token for known registry',
  )
  t.equal(
    await getAuthHeader('http://example.com/other/a'),
    undefined,
    'should return undefined for unknown registry',
  )
  t.strictSame(
    calls,
    [
      ['http://example.com/private/registry/a', 'myid'],
      ['http://example.com/other/a', 'myid'],
    ],
    'should forward url and configured identity',
  )
})
