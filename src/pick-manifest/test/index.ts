import { Range } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import t from 'tap'
import {
  Manifest,
  ManifestMinified,
  Packument,
  PackumentMinified,
} from '@vltpkg/types'
import { pickManifest } from '../src/index.js'

// don't need to run, just for typechecking
const typechecks = () => {
  let paku = {} as unknown as Packument
  let pakuMin = {} as unknown as PackumentMinified
  const optBefore = { before: 1 }
  const optNoBefore = {}
  let mani: Manifest | undefined
  let maniMin: ManifestMinified | undefined
  mani = pickManifest(paku, 'x', optBefore)
  maniMin = pickManifest(paku, 'x', optBefore)
  //@ts-expect-error
  if (maniMin) maniMin.foo = 'bar'
  if (mani) mani.foo = 'bar'
  const x = pickManifest(pakuMin, 'x', optNoBefore)
  //@ts-expect-error
  x.foo = 'bar'

  // because minified is a subset, they can be assigned to each other
  // but, it'll prevent you from accessing arbitrary values on the
  // minified type.
  maniMin = mani
  //@ts-expect-error
  mani = maniMin
  //@ts-expect-error
  paku = pakuMin
  pakuMin = paku
  const pm: PackumentMinified = paku
  const mm: ManifestMinified = mani ?? {}
  //@ts-expect-error
  pm.foo = 'bar'
  //@ts-expect-error
  mm.true = false
}
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
typechecks

t.test('basic carat range selection', t => {
  const metadata = {
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

t.test('caret range object selection', t => {
  const metadata = {
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
    pickManifest({ versions: {} } as unknown as Packument, '*'),
    undefined,
  )
  t.equal(pickManifest({} as unknown as Packument, '*'), undefined)
  t.end()
})

t.test('matches even if requested version has spaces', t => {
  const metadata = {
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
