import { join } from 'node:path'
import t from 'tap'
import { resolveSkillFiles } from '../src/resolve-files.ts'

t.test('resolveSkillFiles', async t => {
  t.test(
    'follows relative links and recurses into linked markdown',
    async t => {
      const dir = t.testdir({
        'SKILL.md': [
          '# Skill',
          'See [reference](REFERENCE.md) and [nested](docs/nested.md).',
          'Skip [anchor only](#section) and [external](https://example.com/x.md).',
        ].join('\n'),
        'REFERENCE.md': '# Reference',
        docs: {
          'nested.md': 'See [asset](../assets/logo.png).',
        },
        assets: {
          'logo.png': 'binary-ish',
        },
      })
      const files = resolveSkillFiles({ name: 'test-skill', dir })
      t.strictSame(
        new Set(files),
        new Set([
          'SKILL.md',
          'REFERENCE.md',
          join('docs', 'nested.md'),
          join('assets', 'logo.png'),
        ]),
      )
    },
  )

  t.test(
    'does not follow links inside non-markdown files',
    async t => {
      const dir = t.testdir({
        'SKILL.md': 'See [asset](asset.txt).',
        'asset.txt':
          'plain text with a fake link: [fake](../../etc/passwd)',
      })
      const files = resolveSkillFiles({ name: 'test-skill', dir })
      t.strictSame(new Set(files), new Set(['SKILL.md', 'asset.txt']))
    },
  )

  t.test('dedupes a file linked more than once', async t => {
    const dir = t.testdir({
      'SKILL.md':
        'See [a](REFERENCE.md) and again [b](REFERENCE.md).',
      'REFERENCE.md': '# Reference',
    })
    const files = resolveSkillFiles({ name: 'test-skill', dir })
    t.strictSame(
      new Set(files),
      new Set(['SKILL.md', 'REFERENCE.md']),
    )
  })

  t.test('ignores a whitespace-only link target', async t => {
    const dir = t.testdir({
      'SKILL.md': 'See [weird]( ).',
    })
    const files = resolveSkillFiles({ name: 'test-skill', dir })
    t.strictSame(new Set(files), new Set(['SKILL.md']))
  })

  t.test('throws when a linked file does not exist', async t => {
    const dir = t.testdir({
      'SKILL.md': 'See [missing](missing.md).',
    })
    t.throws(
      () => resolveSkillFiles({ name: 'test-skill', dir }),
      /linked file not found: missing\.md/,
    )
  })

  t.test(
    'throws when a link escapes the skill directory',
    async t => {
      const dir = t.testdir({
        inner: {
          'SKILL.md': 'See [escape](../outside.md).',
        },
        'outside.md': '# outside',
      })
      t.throws(
        () =>
          resolveSkillFiles({
            name: 'test-skill',
            dir: join(dir, 'inner'),
          }),
        /escapes the skill directory/,
      )
    },
  )
})
