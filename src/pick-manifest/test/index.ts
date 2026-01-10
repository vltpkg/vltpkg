import { Range, isRange } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import { isSpec } from '@vltpkg/spec/browser'
import t from 'tap'
import type { Manifest, Packument } from '@vltpkg/types'
import {
  pickManifest,
  platformCheck,
  detectLibc,
  LDD_PATH,
  resetLibcCache,
} from '../src/index.ts'

type PickManifestModule = typeof import('../src/index.ts')

// don't need to run, just for typechecking
const typechecks = () => {
  // verify node version can be a string
  platformCheck({}, '1.2.3')
  const paku = {} as unknown as Packument
  const optBefore = { before: 1 }
  const mani = pickManifest(paku, 'x', optBefore)
  //@ts-expect-error
  if (mani) mani.foo = 'bar'

  const mm: Manifest = mani ?? {}
  //@ts-expect-error
  pm.foo = 'bar'
  //@ts-expect-error
  mm.true = false
}
void typechecks

t.test('basic carat range selection', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '^1.0.0')
  t.equal(
    manifest?.version,
    '1.0.2',
    'picked the right manifest using ^',
  )
  t.end()
})

t.test('correctly handles Range vs Spec objects', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument

  // Create objects that look similar but are different types
  const rangeObj = new Range('^1.0.0')
  const specObj = Spec.parse('foo@^1.0.0')

  // Verify type guards work correctly
  t.equal(
    isRange(rangeObj),
    true,
    'correctly identifies Range object',
  )
  t.equal(isSpec(specObj), true, 'correctly identifies Spec object')
  t.equal(isRange(specObj), false, 'correctly rejects Spec as Range')
  t.equal(isSpec(rangeObj), false, 'correctly rejects Range as Spec')

  // Verify pickManifest handles both correctly
  const manifestFromRange = pickManifest(metadata, rangeObj)
  const manifestFromSpec = pickManifest(metadata, specObj)

  t.equal(
    manifestFromRange?.version,
    '1.0.2',
    'picked correct version from Range object',
  )

  t.equal(
    manifestFromSpec?.version,
    '1.0.2',
    'picked correct version from Spec object',
  )

  t.end()
})

t.test('handles edge cases with similar objects', t => {
  const metadata = {
    name: 'test-package',
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument

  // Create a mock object with some properties but not enough to be recognized as Range or Spec
  const mockObj = {
    spec: 'test@^1.0.0',
    name: 'test',
    // Intentionally missing required Range properties (e.g., set with Comparator instances)
  }

  // Verify type guards correctly reject this
  t.equal(
    isRange(mockObj),
    false,
    'rejects object with incomplete Range properties',
  )
  t.equal(
    isSpec(mockObj),
    false,
    'rejects object with incomplete Spec properties',
  )

  // Test with an invalid object type
  try {
    pickManifest(metadata, mockObj as any)
    t.fail('should have thrown an error')
  } catch (err: any) {
    t.match(
      err.message,
      /is not a function|Only dist-tag or semver range specs are supported/,
      'rejects invalid object with appropriate error',
    )
  }

  t.end()
})

t.test('do not be confused by subspecs', t => {
  const metadata = {
    name: 'bar',
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(
    metadata,
    Spec.parse('foo@npm:bar@^1.0.0'),
  )
  t.equal(
    manifest?.version,
    '1.0.2',
    'picked the right manifest using ^ in a subspec',
  )
  t.end()
})

t.test('caret range object selection', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, new Range('^1.0.0'))
  t.equal(
    manifest?.version,
    '1.0.2',
    'picked the right manifest using ^',
  )
  t.end()
})

t.test('caret spec object selection', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, Spec.parse('foo@^1.0.0'))
  t.equal(
    manifest?.version,
    '1.0.2',
    'picked the right manifest using ^',
  )
  t.end()
})

t.test('basic tilde range selection', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '~1.0.0')
  t.equal(
    manifest?.version,
    '1.0.2',
    'picked the right manifest using ~',
  )
  t.end()
})

t.test('basic mathematical range selection', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest1 = pickManifest(metadata, '>=1.0.0 <2')
  t.equal(
    manifest1?.version,
    '1.0.2',
    'picked the right manifest using mathematical range',
  )
  const manifest2 = pickManifest(metadata, '=1.0.0')
  t.equal(
    manifest2?.version,
    '1.0.0',
    'picked the right manifest using mathematical range',
  )
  t.end()
})

t.test('basic version selection', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '1.0.0')
  t.equal(
    manifest?.version,
    '1.0.0',
    'picked the right manifest using specific version',
  )
  t.end()
})

t.test('basic tag selection', t => {
  const metadata = {
    'dist-tags': {
      foo: '1.0.1',
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, 'foo')
  t.equal(
    manifest?.version,
    '1.0.1',
    'picked the right manifest using tag',
  )
  t.end()
})

t.test('errors if a non-registry spec is provided', t => {
  const metadata = {
    'dist-tags': {
      foo: '1.0.1',
    },
    versions: {
      '1.0.1': { version: '1.0.1' },
    },
  } as unknown as Packument
  t.throws(
    () => {
      pickManifest(
        metadata,
        'github:vltpkg/vlgpkt#path:src/pick-manifest',
      )
    },
    { message: 'Only dist-tag or semver range specs are supported' },
  )
  t.throws(
    () => {
      pickManifest(metadata, 'file:foo.tar.gz')
    },
    { message: 'Only dist-tag or semver range specs are supported' },
  )
  t.end()
})

t.test('skips any invalid version keys', t => {
  // Various third-party registries are prone to having trash as
  // keys. npm simply skips them. Yay robustness.
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      'lol ok': { version: '1.0.1' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '^1.0.0')
  t.equal(manifest?.version, '1.0.0', 'avoided bad key')
  t.equal(pickManifest(metadata, '^1.0.1'), undefined)
  t.end()
})

t.test('ETARGET if range does not match anything', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '2.0.0': { version: '2.0.0' },
      '2.0.5': { version: '2.0.5' },
    },
  } as unknown as Packument
  t.equal(pickManifest(metadata, '^2.1.0'), undefined)
  t.end()
})

t.test('if `defaultTag` matches a given range, use it', t => {
  const metadata = {
    'dist-tags': {
      foo: '1.0.1',
      latest: '1.0.0',
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  t.equal(
    pickManifest(metadata, '^1.0.0', { tag: 'foo' })?.version,
    '1.0.1',
    'picked the version for foo',
  )
  t.equal(
    pickManifest(metadata, '^2.0.0', { tag: 'foo' })?.version,
    '2.0.0',
    'no match, no foo',
  )
  t.equal(
    pickManifest(metadata, '^1.0.0')?.version,
    '1.0.0',
    'default to `latest`',
  )
  t.end()
})

t.test('* ranges use `defaultTag` if no versions match', t => {
  const metadata = {
    'dist-tags': {
      latest: '1.0.0-pre.0',
      beta: '2.0.0-beta.0',
    },
    versions: {
      '1.0.0-pre.0': { version: '1.0.0-pre.0' },
      '1.0.0-pre.1': { version: '1.0.0-pre.1' },
      '2.0.0-beta.0': { version: '2.0.0-beta.0' },
      '2.0.0-beta.1': { version: '2.0.0-beta.1' },
    },
  } as unknown as Packument
  t.equal(
    pickManifest(metadata, '*', { tag: 'beta' })?.version,
    '2.0.0-beta.0',
    'used defaultTag for all-prerelease splat.',
  )
  t.equal(
    pickManifest(metadata, '*')?.version,
    '1.0.0-pre.0',
    'defaulted to `latest` when wanted is *',
  )
  t.equal(
    pickManifest(metadata, '', { tag: 'beta' })?.version,
    '2.0.0-beta.0',
    'used defaultTag for all-prerelease ""',
  )
  t.equal(
    pickManifest(metadata, '')?.version,
    '1.0.0-pre.0',
    'defaulted to `latest` when wanted is ""',
  )
  t.end()
})

t.test('explicit dist-tag must match that version', t => {
  const paku = {
    'dist-tags': {
      latest: '1.0.0-pre.0',
    },
    versions: {
      '1.0.0-pre.0': { version: '1.0.0-pre.0' },
      '1.0.0-pre.1': { version: '1.0.0-pre.1' },
      '2.0.0-beta.0': { version: '2.0.0-beta.0' },
      '2.0.0-beta.1': { version: '2.0.0-beta.1' },
    },
  } as unknown as Packument
  t.equal(pickManifest(paku, 'beta'), undefined)
  t.end()
})

t.test('not found if metadata has no versions', t => {
  t.equal(
    pickManifest(
      { 'dist-tags': {}, versions: {} } as unknown as Packument,
      '*',
    ),
    undefined,
  )
  t.equal(
    pickManifest(
      { 'dist-tags': {}, versions: {} } as unknown as Packument,
      '*',
    ),
    undefined,
  )
  t.end()
})

t.test('matches even if requested version has spaces', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '  1.0.0 ')
  t.equal(
    manifest?.version,
    '1.0.0',
    'picked the right manifest even though `wanted` had spaced',
  )
  t.end()
})

t.test('matches skip deprecated versions', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.1.0': { version: '1.1.0', deprecated: 'yes' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '^1.0.0')
  t.equal(manifest?.version, '1.0.1', 'picked the right manifest')
  t.end()
})

t.test('matches deprecated versions if we have to', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.1.0': { version: '1.1.0', deprecated: 'yes' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '^1.1.0')
  t.equal(manifest?.version, '1.1.0', 'picked the right manifest')
  t.end()
})

t.test(
  'prefer non-deprecated versions if all platform mismatch',
  t => {
    const metadata = {
      'dist-tags': {},
      versions: {
        '1.0.0': { version: '1.0.0' },
        '1.0.1': { version: '1.0.1' },
        '1.1.2': {
          version: '1.1.0',
          deprecated: 'yes',
          os: 'android',
        },
        '1.1.0': { version: '1.1.0', os: 'android' },
        '1.1.999': {
          version: '1.1.999',
          deprecated: 'yes',
          os: 'android',
        },
        '2.0.0': { version: '2.0.0' },
      },
    } as unknown as Packument
    const manifest = pickManifest(metadata, '^1.1', { os: 'darwin' })
    t.equal(manifest?.version, '1.1.0', 'picked the right manifest')
    t.end()
  },
)

t.test('prefer valid platform matches if all deprecated', t => {
  const metadata = {
    'dist-tags': { latest: '1.1.2' },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.1.2': { version: '1.1.0', deprecated: 'yes', os: 'android' },
      '1.1.0': { version: '1.1.0', deprecated: 'yes', os: ['any'] },
      '1.1.999': {
        version: '1.1.999',
        deprecated: 'yes',
        os: 'android',
      },
      '2.0.0': { version: '2.0.0' },
      '2.0.1': { version: '2.0.1', os: ['nope'] },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '^1.1', { os: 'darwin' })
  t.equal(manifest?.version, '1.1.0', 'picked the right manifest')
  const manifest2 = pickManifest(metadata, '2', { os: 'darwin' })
  t.equal(manifest2?.version, '2.0.0', 'picked the right manifest')
  t.end()
})

t.test('prefer non-prerelease versions', t => {
  const metadata = {
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.1.0': { version: '1.1.0' },
      '2.0.0': { version: '2.0.0' },
      '2.0.999-pre': { version: '2.0.999-pre' },
    },
  } as unknown as Packument
  const manifest = pickManifest(metadata, '*')
  t.equal(
    manifest?.version,
    '2.0.0',
    'picked the non-prerelease manifest',
  )
  t.end()
})

t.test(
  'prefer non-prerelease versions when prerelease comes first',
  t => {
    const metadata = {
      'dist-tags': {},
      versions: {
        '1.0.0': { version: '1.0.0' },
        '2.0.999-pre': { version: '2.0.999-pre' },
        '1.0.1': { version: '1.0.1' },
        '1.1.0': { version: '1.1.0' },
        '2.0.0': { version: '2.0.0' },
      },
    } as unknown as Packument
    const manifest = pickManifest(
      metadata,
      '>=2.0.0 || >=2.0.999-alpha',
    )
    t.equal(
      manifest?.version,
      '2.0.0',
      'picked the non-prerelease manifest',
    )
    t.end()
  },
)

t.test(
  'will use deprecated version if no other suitable match',
  t => {
    const metadata = {
      'dist-tags': {},
      versions: {
        '1.0.0': { version: '1.0.0' },
        '1.0.1': { version: '1.0.1' },
        '1.1.0': { version: '1.1.0', deprecated: 'yes' },
        '2.0.0': { version: '2.0.0' },
      },
    } as unknown as Packument
    const manifest = pickManifest(metadata, '^1.1.0')
    t.equal(manifest?.version, '1.1.0', 'picked the right manifest')
    t.end()
  },
)

t.test('accepts opts.before option to do date-based cutoffs', t => {
  const metadata = {
    'dist-tags': {
      latest: '3.0.0',
    },
    time: {
      modified: '2018-01-03T00:00:00.000Z',
      created: '2018-01-01T00:00:00.000Z',
      '1.0.0': '2018-01-01T00:00:00.000Z',
      '2.0.0': '2018-01-02T00:00:00.000Z',
      '2.0.1': '2018-01-03T00:00:00.000Z',
      '2.0.2': '2018-01-03T00:00:00.123Z',
      '3.0.0': '2018-01-04T00:00:00.000Z',
    },
    versions: {
      '1.0.0': { version: '1.0.0' },
      '2.0.0': { version: '2.0.0' },
      '2.0.1': { version: '2.0.1' },
      '3.0.0': { version: '3.0.0' },
    },
  } as unknown as Packument

  let manifest = pickManifest(metadata, '*', {
    before: '2018-01-02',
  })
  t.equal(
    manifest?.version,
    '2.0.0',
    'filtered out 3.0.0 because of dates',
  )

  manifest = pickManifest(metadata, 'latest', {
    before: '2018-01-02',
  })
  t.equal(
    manifest?.version,
    '2.0.0',
    'tag specs pick highest before dist-tag but within the range in question',
  )

  manifest = pickManifest(metadata, '*', {
    before: Date.parse('2018-01-03T00:00:00.000Z'),
  })
  t.equal(
    manifest?.version,
    '2.0.1',
    'numeric timestamp supported with ms accuracy',
  )

  manifest = pickManifest(metadata, '*', {
    before: new Date('2018-01-03T00:00:00.000Z'),
  })
  t.equal(
    manifest?.version,
    '2.0.1',
    'date obj supported with ms accuracy',
  )

  t.equal(
    pickManifest(metadata, '3.0.0', {
      before: '2018-01-02',
    }),
    undefined,
    'version filtered out by date',
  )

  t.equal(
    pickManifest(metadata, '', {
      before: '1918-01-02',
    }),
    undefined,
    'all version filtered out by date',
  )

  manifest = pickManifest(metadata, '^2', {
    before: '2018-01-02',
  })
  t.equal(manifest?.version, '2.0.0', 'non-tag ranges filtered')

  t.equal(
    pickManifest(metadata, '^3', {
      before: '2018-01-02',
    }),
    undefined,
    'range for out-of-range spec fails even if defaultTag avail',
  )
  t.end()
})

t.test('prefers versions that satisfy the engines requirement', t => {
  const pack = {
    'dist-tags': {
      latest: '1.5.0', // do not default latest if engine mismatch
    },
    versions: {
      '1.0.0': { version: '1.0.0', engines: { node: '>=4' } },
      '1.1.0': { version: '1.1.0', engines: { node: '>=6' } },
      '1.2.0': { version: '1.2.0', engines: { node: '>=8' } },
      '1.3.0': { version: '1.3.0', engines: { node: '>=10' } },
      '1.4.0': { version: '1.4.0', engines: { node: '>=12' } },
      '1.5.0': { version: '1.5.0', engines: { node: '>=14' } },
      // not tagged as latest, won't be chosen by default
      '1.5.1': { version: '1.5.1', engines: { node: '>=14' } },
    },
  } as unknown as Packument

  t.equal(
    pickManifest(pack, '1.x', { 'node-version': '14.0.0' })?.version,
    '1.5.0',
    'prefer default dist-tag version, if possible',
  )
  t.equal(
    pickManifest(pack, '1.x', { 'node-version': '12.0.0' })?.version,
    '1.4.0',
  )
  t.equal(
    pickManifest(pack, '1.x', { 'node-version': '10.0.0' })?.version,
    '1.3.0',
  )
  t.equal(
    pickManifest(pack, '1.x', { 'node-version': '8.0.0' })?.version,
    '1.2.0',
  )
  t.equal(
    pickManifest(pack, '1.x', { 'node-version': '6.0.0' })?.version,
    '1.1.0',
  )
  t.equal(
    pickManifest(pack, '1.x', { 'node-version': '4.0.0' })?.version,
    '1.0.0',
  )
  t.equal(
    pickManifest(pack, '1.x', { 'node-version': '1.2.3' })?.version,
    '1.5.0',
    'if no engine-match exists, just use whatever',
  )
  t.end()
})

t.test('prefers versions that satisfy the os/arch requirement', t => {
  const pack = {
    'dist-tags': {
      latest: '1.5.0', // do not default latest if platform mismatch
    },
    versions: {
      '1.0.0': {
        version: '1.0.0',
        os: ['linux', '!freebsd'],
        cpu: ['arm64'],
      },
      '1.1.0': {
        version: '1.1.0',
        os: ['linux', '!freebsd'],
        cpu: ['x64', 'arm64'],
      },
      '1.2.0': {
        version: '1.2.0',
        os: ['linux', '!freebsd'],
        cpu: ['arm64'],
      },
      '1.3.0': {
        version: '1.3.0',
        os: ['linux', '!freebsd'],
        cpu: ['x64', 'arm64'],
      },
      '1.4.0': {
        version: '1.4.0',
        os: ['linux', 'freebsd'],
        cpu: ['arm64', 'mips'],
      },
      '1.5.0': {
        version: '1.5.0',
        os: ['linux', '!freebsd'],
        cpu: ['x64', 'arm64'],
      },
      '1.5.1': {
        version: '1.5.1',
        os: ['linux', 'freebsd'],
        cpu: ['x64', 'arm64'],
      },
    },
  } as unknown as Packument

  t.equal(
    pickManifest(pack, '1.x', { os: 'linux', arch: 'arm64' })
      ?.version,
    '1.5.0',
    'prefer default dist-tag version, if all the same',
  )
  t.equal(
    pickManifest(pack, '1.x', { os: 'freebsd', arch: 'x64' })
      ?.version,
    '1.5.1',
  )
  t.equal(
    pickManifest(pack, '1.x', { os: 'freebsd', arch: 'mips' })
      ?.version,
    '1.4.0',
  )
  t.equal(
    pickManifest(pack, '1.x', { os: 'android', arch: 'ppc' })
      ?.version,
    '1.5.0',
    'if no engine-match exists, just use whatever',
  )
  t.end()
})

t.test('handles complex Spec objects with subspecs correctly', t => {
  const metadata = {
    name: 'baz',
    'dist-tags': {},
    versions: {
      '1.0.0': { version: '1.0.0' },
      '1.0.1': { version: '1.0.1' },
      '1.0.2': { version: '1.0.2' },
      '2.0.0': { version: '2.0.0' },
    },
  } as unknown as Packument

  // Create a nested spec: foo@npm:bar@npm:baz@^1.0.0
  const nestedSpec = Spec.parse('foo@npm:bar@npm:baz@^1.0.0')

  // Verify it's recognized correctly
  t.equal(
    isSpec(nestedSpec),
    true,
    'correctly identifies nested Spec object',
  )
  t.equal(
    isRange(nestedSpec),
    false,
    'correctly rejects nested Spec as Range',
  )

  // Verify pickManifest extracts the correct range from nested specs
  const manifestFromNestedSpec = pickManifest(metadata, nestedSpec)

  t.equal(
    manifestFromNestedSpec?.version,
    '1.0.2',
    'picked correct version from nested Spec object',
  )

  // Create a more deeply nested spec
  const deeplyNestedSpec = Spec.parse(
    'pkg1@npm:pkg2@npm:pkg3@npm:baz@^1.0.0',
  )
  const manifestFromDeeplyNestedSpec = pickManifest(
    metadata,
    deeplyNestedSpec,
  )

  t.equal(
    manifestFromDeeplyNestedSpec?.version,
    '1.0.2',
    'picked correct version from deeply nested Spec object',
  )

  t.end()
})

t.test('detectLibc returns string or undefined', t => {
  const result = detectLibc()
  // Should return 'glibc', 'musl', or undefined depending on platform
  if (process.platform === 'linux') {
    t.ok(
      result === 'glibc' || result === 'musl' || result === undefined,
      'on linux, returns glibc, musl, or undefined',
    )
    const cached = detectLibc()
    t.equal(result, cached, 'should return cached result')
  } else {
    t.equal(result, undefined, 'on non-linux, returns undefined')
  }
  t.end()
})

t.test('platformCheck handles libc field', t => {
  // Test that packages without libc field always pass
  t.equal(
    platformCheck({}, '20.0.0', 'linux', 'x64', 'glibc'),
    true,
    'no libc field always passes',
  )

  // Test that packages with libc field check against provided libc
  t.equal(
    platformCheck(
      { libc: ['glibc'] },
      '20.0.0',
      'linux',
      'x64',
      'glibc',
    ),
    true,
    'matching libc passes',
  )
  t.equal(
    platformCheck(
      { libc: ['musl'] },
      '20.0.0',
      'linux',
      'x64',
      'glibc',
    ),
    false,
    'non-matching libc fails',
  )

  // Test negation
  t.equal(
    platformCheck(
      { libc: ['!musl'] },
      '20.0.0',
      'linux',
      'x64',
      'glibc',
    ),
    true,
    'negated libc that does not match passes',
  )
  t.equal(
    platformCheck(
      { libc: ['!glibc'] },
      '20.0.0',
      'linux',
      'x64',
      'glibc',
    ),
    false,
    'negated libc that matches fails',
  )

  // Test libc as string (not array)
  t.equal(
    platformCheck(
      { libc: 'glibc' },
      '20.0.0',
      'linux',
      'x64',
      'glibc',
    ),
    true,
    'libc as string works',
  )

  // Test that libc requires a known libc family
  t.equal(
    platformCheck(
      { libc: ['glibc'] },
      '20.0.0',
      'linux',
      'x64',
      undefined,
    ),
    false,
    'libc field with undefined libc fails',
  )

  t.end()
})

t.test('prefers versions that satisfy the libc requirement', t => {
  // Test with packages that all have libc restrictions
  const packWithRestrictions = {
    'dist-tags': {
      latest: '1.3.0',
    },
    versions: {
      '1.0.0': { version: '1.0.0', libc: ['glibc'] },
      '1.1.0': { version: '1.1.0', libc: ['musl'] },
      '1.2.0': { version: '1.2.0', libc: ['glibc', 'musl'] },
      '1.3.0': { version: '1.3.0', libc: ['musl'] },
    },
  } as unknown as Packument

  t.equal(
    pickManifest(packWithRestrictions, '1.x', { libc: 'glibc' })
      ?.version,
    '1.2.0',
    'picks highest glibc-compatible version',
  )
  t.equal(
    pickManifest(packWithRestrictions, '1.x', { libc: 'musl' })
      ?.version,
    '1.3.0',
    'picks latest musl-compatible version (dist-tag)',
  )

  // Test that packages without libc restrictions are preferred
  // when libc cannot be determined
  const packWithUnrestricted = {
    'dist-tags': {
      latest: '1.3.0',
    },
    versions: {
      '1.0.0': { version: '1.0.0', libc: ['glibc'] },
      '1.4.0': { version: '1.4.0' }, // no libc restriction
    },
  } as unknown as Packument

  t.equal(
    pickManifest(packWithUnrestricted, '1.x', { libc: undefined })
      ?.version,
    '1.4.0',
    'picks version without libc restriction when libc unknown',
  )
  t.end()
})

t.test('libc platform check with negation patterns', t => {
  const pack = {
    'dist-tags': {
      latest: '1.2.0',
    },
    versions: {
      '1.0.0': { version: '1.0.0', libc: ['!musl'] },
      '1.1.0': { version: '1.1.0', libc: ['!glibc'] },
      '1.2.0': { version: '1.2.0', libc: ['!musl'] },
    },
  } as unknown as Packument

  t.equal(
    pickManifest(pack, '1.x', { libc: 'glibc' })?.version,
    '1.2.0',
    'picks version that does not exclude glibc',
  )
  t.equal(
    pickManifest(pack, '1.x', { libc: 'musl' })?.version,
    '1.1.0',
    'picks version that does not exclude musl',
  )
  t.end()
})

t.test('LDD_PATH constant is exported', t => {
  t.equal(LDD_PATH, '/usr/bin/ldd', 'LDD_PATH has correct value')
  t.end()
})

t.test('getFamilyFromFilesystem (mocked)', async t => {
  // Test glibc detection from filesystem
  t.test('detects glibc from ldd file content', async t => {
    const { getFamilyFromFilesystem } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': {
          readFileSync: () => 'GNU C Library (glibc) 2.31',
        },
      })
    t.equal(getFamilyFromFilesystem(), 'glibc')
  })

  // Test musl detection from filesystem
  t.test('detects musl from ldd file content', async t => {
    const { getFamilyFromFilesystem } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': {
          readFileSync: () => 'musl libc (x86_64)',
        },
      })
    t.equal(getFamilyFromFilesystem(), 'musl')
  })

  // Test unknown libc in ldd file
  t.test('returns null for unrecognized ldd content', async t => {
    const { getFamilyFromFilesystem } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': {
          readFileSync: () => 'some other libc implementation',
        },
      })
    t.equal(getFamilyFromFilesystem(), null)
  })

  // Test file read error
  t.test('returns undefined when file cannot be read', async t => {
    const { getFamilyFromFilesystem } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': {
          readFileSync: () => {
            throw new Error('ENOENT')
          },
        },
      })
    t.equal(getFamilyFromFilesystem(), undefined)
  })

  t.end()
})

t.test('getFamilyFromReport (mocked)', async t => {
  // Test glibc detection from report
  t.test('detects glibc from process.report', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.intercept(process, 'report', {
      value: {
        excludeNetwork: false,
        getReport: () => ({
          header: { glibcRuntimeVersion: '2.31' },
        }),
      },
    })
    const { getFamilyFromReport } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': { readFileSync: () => '' },
      })
    t.equal(getFamilyFromReport(), 'glibc')
  })

  // Test musl detection from report (via sharedObjects)
  t.test('detects musl from sharedObjects (ld-musl-)', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.intercept(process, 'report', {
      value: {
        excludeNetwork: false,
        getReport: () => ({
          sharedObjects: ['/lib/ld-musl-x86_64.so.1'],
        }),
      },
    })
    const { getFamilyFromReport } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': { readFileSync: () => '' },
      })
    t.equal(getFamilyFromReport(), 'musl')
  })

  // Test musl detection from report (via libc.musl-)
  t.test('detects musl from sharedObjects (libc.musl-)', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.intercept(process, 'report', {
      value: {
        excludeNetwork: false,
        getReport: () => ({
          sharedObjects: ['/lib/libc.musl-x86_64.so.1'],
        }),
      },
    })
    const { getFamilyFromReport } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': { readFileSync: () => '' },
      })
    t.equal(getFamilyFromReport(), 'musl')
  })

  // Test unknown libc from report
  t.test('returns null for unrecognized report', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.intercept(process, 'report', {
      value: {
        excludeNetwork: false,
        getReport: () => ({
          header: {},
          sharedObjects: ['/lib/libc.so.6'],
        }),
      },
    })
    const { getFamilyFromReport } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': { readFileSync: () => '' },
      })
    t.equal(getFamilyFromReport(), null)
  })

  // Test report error
  t.test('returns null when report throws', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.intercept(process, 'report', {
      value: {
        excludeNetwork: false,
        getReport: () => {
          throw new Error('report failed')
        },
      },
    })
    const { getFamilyFromReport } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': { readFileSync: () => '' },
      })
    t.equal(getFamilyFromReport(), null)
  })

  t.end()
})

t.test('detectLibc integration (mocked)', async t => {
  // Test non-linux platform
  t.test('returns undefined on non-linux', async t => {
    t.intercept(process, 'platform', { value: 'darwin' })
    const { detectLibc: detectLibcMocked } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': { readFileSync: () => '' },
      })
    t.equal(detectLibcMocked(), undefined)
  })

  // Test filesystem detection takes precedence
  t.test(
    'filesystem detection takes precedence over report',
    async t => {
      t.intercept(process, 'platform', { value: 'linux' })
      t.intercept(process, 'report', {
        value: {
          excludeNetwork: false,
          getReport: () => ({
            sharedObjects: ['/lib/ld-musl-x86_64.so.1'],
          }),
        },
      })
      const { detectLibc: detectLibcMocked } =
        await t.mockImport<PickManifestModule>('../src/index.ts', {
          'node:fs': {
            readFileSync: () => 'GNU C Library (glibc) 2.31',
          },
        })
      t.equal(detectLibcMocked(), 'glibc')
    },
  )

  // Test fallback to report when filesystem fails
  t.test(
    'falls back to report when filesystem detection fails',
    async t => {
      t.intercept(process, 'platform', { value: 'linux' })
      t.intercept(process, 'report', {
        value: {
          excludeNetwork: false,
          getReport: () => ({
            header: { glibcRuntimeVersion: '2.31' },
          }),
        },
      })
      const { detectLibc: detectLibcMocked } =
        await t.mockImport<PickManifestModule>('../src/index.ts', {
          'node:fs': {
            readFileSync: () => {
              throw new Error('ENOENT')
            },
          },
        })
      t.equal(detectLibcMocked(), 'glibc')
    },
  )

  // Test caching behavior
  t.test('returns cached result on subsequent calls', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    const { detectLibc: detectLibcMocked } =
      await t.mockImport<PickManifestModule>('../src/index.ts', {
        'node:fs': {
          readFileSync: () => 'GNU C Library (glibc) 2.31',
        },
      })
    const first = detectLibcMocked()
    const second = detectLibcMocked()
    t.equal(first, second)
    t.equal(first, 'glibc')
  })

  // Test resetLibcCache
  resetLibcCache()
  t.pass('resetLibcCache does not throw')

  t.end()
})
