import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'

t.test('createGetAuthHeader', async t => {
  const calls: [string, string, string[], string][] = []
  const seen: unknown[] = []
  const seenDef: unknown[] = []
  const { createGetAuthHeader } = await t.mockImport<
    typeof import('../src/query-auth.ts')
  >('../src/query-auth.ts', {
    '@vltpkg/registry-client': {
      registryKeys: (o: unknown) => {
        seen.push(o)
        return ['k']
      },
      defaultRegistryKey: (o: unknown) => {
        seenDef.push(o)
        return 'd'
      },
      getTokenByURL: async (
        url: string,
        identity: string,
        keys: string[],
        def: string,
      ) => {
        calls.push([url, identity, keys, def])
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
      ['http://example.com/private/registry/a', 'myid', ['k'], 'd'],
      ['http://example.com/other/a', 'myid', ['k'], 'd'],
    ],
    'should forward url, identity, registry keys and default key',
  )
  t.equal(seen.length, 1, 'keys computed once')
  t.equal(seen[0], conf.options, 'from config options')
  t.strictSame(seenDef, [conf.options], 'default key computed once')
})
