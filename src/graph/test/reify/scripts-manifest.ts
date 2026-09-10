import { PackageJson } from '@vltpkg/package-json'
import { normalizeManifest } from '@vltpkg/types'
import t from 'tap'
import { scriptsManifest } from '../../src/reify/scripts-manifest.ts'

const dir = t.testdir({
  'package.json': JSON.stringify({
    name: 'x',
    version: '1.0.0',
    scripts: { postinstall: 'node setup.js' },
  }),
})
const packageJson = new PackageJson()

t.test('returns a manifest that carries its own scripts', async t => {
  const manifest = normalizeManifest({
    name: 'x',
    version: '1.0.0',
    scripts: { postinstall: 'echo hi' },
  })
  t.equal(scriptsManifest(manifest, dir, packageJson), manifest)
})

t.test(
  'returns a manifest with no install scripts at all',
  async t => {
    const manifest = normalizeManifest({
      name: 'x',
      version: '1.0.0',
    })
    t.equal(scriptsManifest(manifest, dir, packageJson), manifest)
  },
)

t.test('reads package.json for an abbreviated manifest', async t => {
  const manifest = normalizeManifest({
    name: 'x',
    version: '1.0.0',
    hasInstallScript: true,
  })
  const res = scriptsManifest(manifest, dir, packageJson)
  t.not(res, manifest)
  t.strictSame(res.scripts, { postinstall: 'node setup.js' })
})
