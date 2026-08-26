import t from 'tap'
import * as api from '../src/index.ts'

t.test('the pure entry point exports the whole contract', async t => {
  t.strictSame(
    Object.keys(api).sort(),
    [
      'GRAPH_DIFF_SCHEMA_VERSION',
      'MISSING',
      'canonicalIdentity',
      'diffLockfiles',
      'extractRegions',
      'hasChanges',
      'humanDiffOutput',
      'mutationNodes',
      'project',
    ],
    'adding to this list is a schema decision, so make it a visible one',
  )
  t.equal(api.GRAPH_DIFF_SCHEMA_VERSION, 1)
})

t.test(
  'nothing in the pure entry reaches for node builtins',
  async t => {
    // browser-safe means "no node: imports" -- community viewers depend on
    // it, and only ./sources is allowed to touch git or the filesystem
    const { readdirSync, readFileSync } = await import('node:fs')
    const dir = new URL('../src/', import.meta.url)
    for (const file of readdirSync(dir)) {
      if (file === 'sources.ts') continue
      const src = readFileSync(new URL(file, dir), 'utf8')
      t.notMatch(
        src,
        /from '(node:|@vltpkg\/git)/,
        `${file} stays pure`,
      )
    }
  },
)
