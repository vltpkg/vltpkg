import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import t from 'tap'
import {
  cleanManifestArtifacts,
  cleanStale,
  writeSkill,
} from '../src/publish.ts'

t.test('writeSkill', async t => {
  t.test(
    'copies only the given files and writes a .generated sentinel',
    async t => {
      const dir = t.testdir({
        skill: {
          'SKILL.md': '# demo',
          'REFERENCE.md': '# reference',
          'unlinked.md': '# not part of the file set',
        },
        out: {},
      })
      const skillDir = join(dir, 'skill')
      const outputRoot = join(dir, 'out')

      writeSkill(
        { name: 'demo', dir: skillDir },
        ['SKILL.md', 'REFERENCE.md'],
        outputRoot,
      )

      const destDir = join(outputRoot, 'demo')
      t.equal(
        readFileSync(join(destDir, 'SKILL.md'), 'utf8'),
        '# demo',
      )
      t.ok(existsSync(join(destDir, 'REFERENCE.md')))
      t.notOk(existsSync(join(destDir, 'unlinked.md')))
      t.ok(existsSync(join(destDir, '.generated')))
    },
  )

  t.test('creates nested directories for nested files', async t => {
    const dir = t.testdir({
      skill: {
        'SKILL.md': '# demo',
        docs: { 'nested.md': '# nested' },
      },
      out: {},
    })
    const skillDir = join(dir, 'skill')
    const outputRoot = join(dir, 'out')

    writeSkill(
      { name: 'demo', dir: skillDir },
      ['SKILL.md', join('docs', 'nested.md')],
      outputRoot,
    )

    t.ok(existsSync(join(outputRoot, 'demo', 'docs', 'nested.md')))
  })

  t.test('fully replaces a previously written skill dir', async t => {
    const dir = t.testdir({
      skill: { 'SKILL.md': '# demo' },
      out: {},
    })
    const skillDir = join(dir, 'skill')
    const outputRoot = join(dir, 'out')

    writeSkill(
      { name: 'demo', dir: skillDir },
      ['SKILL.md'],
      outputRoot,
    )
    writeFileSync(join(outputRoot, 'demo', 'stale.md'), 'leftover')
    t.ok(existsSync(join(outputRoot, 'demo', 'stale.md')))

    writeSkill(
      { name: 'demo', dir: skillDir },
      ['SKILL.md'],
      outputRoot,
    )
    t.notOk(existsSync(join(outputRoot, 'demo', 'stale.md')))
  })
})

t.test('cleanStale', async t => {
  t.test(
    'removes generated dirs not in the current name set',
    async t => {
      const dir = t.testdir({
        out: {
          'old-skill': { '.generated': '', 'SKILL.md': 'stale' },
          current: { '.generated': '', 'SKILL.md': 'kept' },
        },
      })
      const outputRoot = join(dir, 'out')
      cleanStale(outputRoot, new Set(['current']))
      t.notOk(existsSync(join(outputRoot, 'old-skill')))
      t.ok(existsSync(join(outputRoot, 'current')))
    },
  )

  t.test(
    'never removes hand-authored dirs without a .generated sentinel',
    async t => {
      const dir = t.testdir({
        out: {
          'hand-authored': { 'SKILL.md': 'kept' },
        },
      })
      const outputRoot = join(dir, 'out')
      cleanStale(outputRoot, new Set())
      t.ok(existsSync(join(outputRoot, 'hand-authored')))
    },
  )

  t.test(
    'is a no-op when the output root does not exist',
    async t => {
      const dir = t.testdir({})
      t.doesNotThrow(() =>
        cleanStale(join(dir, 'does-not-exist'), new Set()),
      )
    },
  )

  t.test(
    'skips stray non-directory entries in the output root',
    async t => {
      const dir = t.testdir({
        out: { '.DS_Store': 'not a directory' },
      })
      const outputRoot = join(dir, 'out')
      t.doesNotThrow(() => cleanStale(outputRoot, new Set()))
      t.ok(existsSync(join(outputRoot, '.DS_Store')))
    },
  )
})

t.test('cleanManifestArtifacts', async t => {
  t.test('removes *.tar.gz files and index.json', async t => {
    const dir = t.testdir({
      out: {
        'bundled.tar.gz': 'archive bytes',
        'index.json': '{}',
        demo: { 'SKILL.md': 'kept' },
      },
    })
    const outputRoot = join(dir, 'out')
    cleanManifestArtifacts(outputRoot)
    t.notOk(existsSync(join(outputRoot, 'bundled.tar.gz')))
    t.notOk(existsSync(join(outputRoot, 'index.json')))
    t.ok(existsSync(join(outputRoot, 'demo', 'SKILL.md')))
  })

  t.test(
    'is a no-op when the output root does not exist',
    async t => {
      const dir = t.testdir({})
      t.doesNotThrow(() =>
        cleanManifestArtifacts(join(dir, 'does-not-exist')),
      )
    },
  )
})
